import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST — save a draft or final submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attemptId, content, isDraft = true } = body;

    if (!attemptId || !content) {
      return NextResponse.json(
        { error: "attemptId and content are required" },
        { status: 400 }
      );
    }

    // Verify attempt exists and is in Draft or Submitted state
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        submissions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    if (attempt.status !== "Draft" && attempt.status !== "Submitted") {
      return NextResponse.json(
        {
          error: `Cannot submit: attempt is in '${attempt.status}' state`,
        },
        { status: 400 }
      );
    }

    // Determine version number
    const latestVersion = attempt.submissions[0]?.version || 0;
    const newVersion = latestVersion + 1;

    // Create immutable submission record
    const submission = await prisma.submission.create({
      data: {
        attemptId,
        version: newVersion,
        content: JSON.stringify(content),
        format: "structured-text",
        isDraft,
      },
    });

    // Update attempt status if this is a final submission
    if (!isDraft) {
      await prisma.attempt.update({
        where: { id: attemptId },
        data: {
          status: "Submitted",
          submittedAt: new Date(),
        },
      });
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Failed to create submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
