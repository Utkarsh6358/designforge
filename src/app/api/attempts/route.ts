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

// POST — create a new attempt for a problem
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemId } = body;

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

    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        problemId,
        status: "Draft",
      },
    });

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    console.error("Failed to create attempt:", error);
    return NextResponse.json(
      { error: "Failed to create attempt" },
      { status: 500 }
    );
  }
}
