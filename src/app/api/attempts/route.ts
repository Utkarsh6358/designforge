import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET — list attempts for a user (filtered by problemId if provided)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problemId");

    // Demo user
    const user = await prisma.user.findUnique({
      where: { email: "demo@lldpractice.com" },
    });
    if (!user) {
      return NextResponse.json({ error: "Demo user not found. Run seed first." }, { status: 404 });
    }

    const where: Record<string, string> = { userId: user.id };
    if (problemId) where.problemId = problemId;

    const attempts = await prisma.attempt.findMany({
      where,
      include: {
        problem: true,
        submissions: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            evaluation: {
              include: { feedback: true },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const formatted = attempts.map((a) => ({
      id: a.id,
      problemId: a.problemId,
      problemTitle: a.problem.title,
      problemSlug: a.problem.slug,
      status: a.status,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      latestSubmission: a.submissions[0]
        ? {
            id: a.submissions[0].id,
            version: a.submissions[0].version,
            isDraft: a.submissions[0].isDraft,
            evaluation: a.submissions[0].evaluation
              ? {
                  id: a.submissions[0].evaluation.id,
                  status: a.submissions[0].evaluation.status,
                  overallScore: a.submissions[0].evaluation.overallScore,
                  feedback: a.submissions[0].evaluation.feedback,
                }
              : null,
          }
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch attempts:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempts" },
      { status: 500 }
    );
  }
}

// POST — create a new attempt for a problem (optionally forking from a previous attempt)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemId, forkFromAttemptId } = body;

    if (!problemId) {
      return NextResponse.json(
        { error: "problemId is required" },
        { status: 400 }
      );
    }

    // Demo user
    const user = await prisma.user.findUnique({
      where: { email: "demo@lldpractice.com" },
    });
    if (!user) {
      return NextResponse.json({ error: "Demo user not found. Run seed first." }, { status: 404 });
    }

    // Verify problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    // If forkFromAttemptId provided, find the source submission content to prefill
    let initialContent: string | null = null;
    if (forkFromAttemptId) {
      const sourceAttempt = await prisma.attempt.findUnique({
        where: { id: forkFromAttemptId },
        include: {
          submissions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });
      if (sourceAttempt?.submissions?.[0]?.content) {
        initialContent = sourceAttempt.submissions[0].content;
      }
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        problemId,
        status: "Draft",
      },
    });

    if (initialContent) {
      await prisma.submission.create({
        data: {
          attemptId: attempt.id,
          version: 1,
          content: initialContent,
          format: "structured-text",
          isDraft: true,
        },
      });
    }

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    console.error("Failed to create attempt:", error);
    return NextResponse.json(
      { error: "Failed to create attempt" },
      { status: 500 }
    );
  }
}

// DELETE — delete attempt(s): single by id, problem-level, or all
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get("id");
    const problemId = searchParams.get("problemId");
    const all = searchParams.get("all") === "true";

    const user = await prisma.user.findUnique({
      where: { email: "demo@lldpractice.com" },
    });
    if (!user) {
      return NextResponse.json({ error: "Demo user not found." }, { status: 404 });
    }

    const where: { id?: string; problemId?: string; userId: string } = {
      userId: user.id,
    };

    if (attemptId) {
      where.id = attemptId;
    } else if (problemId) {
      where.problemId = problemId;
    } else if (!all) {
      return NextResponse.json(
        { error: "Provide ?id=<attemptId>, ?problemId=<problemId>, or ?all=true" },
        { status: 400 }
      );
    }

    const attempts = await prisma.attempt.findMany({
      where,
      select: {
        id: true,
        submissions: {
          select: {
            id: true,
            evaluation: { select: { id: true } },
          },
        },
      },
    });

    if (attempts.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No matching attempts found" });
    }

    const attemptIds = attempts.map((a) => a.id);
    const submissionIds = attempts.flatMap((a) => a.submissions.map((s) => s.id));
    const evaluationIds = attempts
      .flatMap((a) => a.submissions.map((s) => s.evaluation?.id))
      .filter(Boolean) as string[];

    await prisma.$transaction([
      ...(evaluationIds.length > 0
        ? [
            prisma.feedback.deleteMany({
              where: { evaluationId: { in: evaluationIds } },
            }),
            prisma.evaluation.deleteMany({
              where: { id: { in: evaluationIds } },
            }),
          ]
        : []),
      ...(submissionIds.length > 0
        ? [
            prisma.submission.deleteMany({
              where: { id: { in: submissionIds } },
            }),
          ]
        : []),
      prisma.attempt.deleteMany({
        where: { id: { in: attemptIds } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deletedCount: attemptIds.length,
    });
  } catch (error) {
    console.error("Failed to delete attempt(s):", error);
    return NextResponse.json(
      { error: "Failed to delete attempt(s)" },
      { status: 500 }
    );
  }
}

