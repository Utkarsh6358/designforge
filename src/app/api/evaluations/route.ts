import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CompositeEvaluator } from "@/lib/evaluator";
import type { SubmissionContent, RubricDimension } from "@/lib/evaluator";

// POST — trigger evaluation for a submission (idempotent)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    // Fetch submission with attempt and problem
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        evaluation: true,
        attempt: {
          include: {
            problem: {
              include: { rubric: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.isDraft) {
      return NextResponse.json(
        { error: "Cannot evaluate a draft submission. Submit it first." },
        { status: 400 }
      );
    }

    // Idempotency: check for existing evaluation
    if (
      submission.evaluation &&
      ["Pending", "Running", "Completed"].includes(submission.evaluation.status)
    ) {
      return NextResponse.json({
        message: "Evaluation already exists",
        evaluation: submission.evaluation,
      });
    }

    // Create evaluation record (Pending)
    const evaluation = await prisma.evaluation.create({
      data: {
        submissionId,
        evaluatorType: "composite",
        status: "Running",
      },
    });

    // Update attempt status
    await prisma.attempt.update({
      where: { id: submission.attemptId },
      data: { status: "Evaluating" },
    });

    // Run evaluation
    try {
      const content: SubmissionContent = JSON.parse(submission.content);
      const rubricDimensions: RubricDimension[] = submission.attempt.problem
        .rubric
        ? JSON.parse(submission.attempt.problem.rubric.dimensions)
        : [];

      const evaluator = new CompositeEvaluator();
      const result = await evaluator.evaluate(content, rubricDimensions);

      // Persist feedback
      for (const fb of result.feedback) {
        await prisma.feedback.create({
          data: {
            evaluationId: evaluation.id,
            criterion: fb.criterion,
            score: fb.score,
            maxScore: fb.maxScore,
            evidence: fb.evidence,
            concern: fb.concern,
            suggestion: fb.suggestion,
            confidence: fb.confidence,
          },
        });
      }

      // Update evaluation status
      const updated = await prisma.evaluation.update({
        where: { id: evaluation.id },
        data: {
          status: result.status,
          overallScore: result.overallScore,
          completedAt: new Date(),
        },
        include: { feedback: true },
      });

      // Update attempt status
      await prisma.attempt.update({
        where: { id: submission.attemptId },
        data: {
          status:
            result.status === "Completed" || result.status === "Partial"
              ? "Completed"
              : "Failed",
        },
      });

      return NextResponse.json(updated);
    } catch (evalError) {
      // Evaluation failed — mark as Failed, but submission is preserved
      console.error("Evaluation failed:", evalError);

      await prisma.evaluation.update({
        where: { id: evaluation.id },
        data: { status: "Failed", completedAt: new Date() },
      });

      await prisma.attempt.update({
        where: { id: submission.attemptId },
        data: { status: "Failed" },
      });

      return NextResponse.json(
        { error: "Evaluation failed", evaluationId: evaluation.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to trigger evaluation:", error);
    return NextResponse.json(
      { error: "Failed to trigger evaluation" },
      { status: 500 }
    );
  }
}
