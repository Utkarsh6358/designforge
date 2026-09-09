"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  attemptCount: number;
  rubricDimensions: { name: string }[];
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/problems")
      .then((res) => res.json())
      .then((data) => {
        setProblems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setProblems([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-[var(--text-muted)]">Loading problems...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Problem Catalog</h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Choose a problem to practice. Each problem includes specific
        requirements and a tailored evaluation rubric.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {problems.map((problem) => (
          <Link key={problem.id} href={`/problems/${problem.slug}`}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 hover:bg-[var(--bg-card-hover)] hover:border-[var(--accent)] transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded border diff-${problem.difficulty.toLowerCase()}`}
                >
                  {problem.difficulty}
                </span>
                {problem.attemptCount > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {problem.attemptCount} attempt
                    {problem.attemptCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold mb-2">{problem.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-3">
                {problem.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {problem.rubricDimensions.slice(0, 3).map((dim) => (
                  <span
                    key={dim.name}
                    className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded"
                  >
                    {dim.name}
                  </span>
                ))}
                {problem.rubricDimensions.length > 3 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    +{problem.rubricDimensions.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {problems.length === 0 && (
        <p className="text-center text-[var(--text-muted)] py-10">
          No problems found. Make sure to run the database seed.
        </p>
      )}
    </div>
  );
}
