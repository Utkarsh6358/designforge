import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problem = await prisma.problem.findUnique({
      where: { slug: id },
      include: { rubric: true },
    });

    if (!problem) {
      // Try by ID
      const byId = await prisma.problem.findUnique({
        where: { id },
        include: { rubric: true },
      });
      if (!byId) {
        return NextResponse.json(
          { error: "Problem not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        ...byId,
        requirements: JSON.parse(byId.requirements),
        constraints: JSON.parse(byId.constraints),
        rubricDimensions: byId.rubric
          ? JSON.parse(byId.rubric.dimensions)
          : [],
      });
    }

    return NextResponse.json({
      ...problem,
      requirements: JSON.parse(problem.requirements),
      constraints: JSON.parse(problem.constraints),
      rubricDimensions: problem.rubric
        ? JSON.parse(problem.rubric.dimensions)
        : [],
    });
  } catch (error) {
    console.error("Failed to fetch problem:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem" },
      { status: 500 }
    );
  }
}
