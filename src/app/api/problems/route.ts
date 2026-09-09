import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const problems = await prisma.problem.findMany({
      include: {
        rubric: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = problems.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      requirements: JSON.parse(p.requirements),
      constraints: JSON.parse(p.constraints),
      difficulty: p.difficulty,
      attemptCount: p._count.attempts,
      rubricDimensions: p.rubric
        ? JSON.parse(p.rubric.dimensions)
        : [],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch problems" },
      { status: 500 }
    );
  }
}
