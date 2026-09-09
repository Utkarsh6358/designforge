import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        problem: {
          include: { rubric: true },
        },
        submissions: {
          orderBy: { version: "desc" },
          include: {
            evaluation: {
              include: { feedback: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...attempt,
      problem: {
        ...attempt.problem,
        requirements: JSON.parse(attempt.problem.requirements),
        constraints: JSON.parse(attempt.problem.constraints),
        rubricDimensions: attempt.problem.rubric
          ? JSON.parse(attempt.problem.rubric.dimensions)
          : [],
      },
    });
  } catch (error) {
    console.error("Failed to fetch attempt:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 }
    );
  }
}
