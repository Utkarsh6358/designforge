"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements: string[];
  constraints: string[];
  difficulty: string;
  rubricDimensions: {
    name: string;
    description: string;
    weight: number;
    maxScore: number;
  }[];
}

interface AttemptSummary {
  id: string;
  status: string;
  startedAt: string;
  latestSubmission?: {
    evaluation?: {
      overallScore: number | null;
      status: string;
    } | null;
  } | null;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/problems/${slug}`).then((r) => r.json()),
      fetch("/api/attempts").then((r) => r.json()),
    ])
      .then(([prob, atts]) => {
        setProblem(prob);
        if (Array.isArray(atts)) {
          setAttempts(
            atts.filter((a: AttemptSummary & { problemSlug?: string }) => a.problemSlug === slug)
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const startAttempt = async () => {
    if (!problem) return;
    setStarting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problem.id }),
      });
      const attempt = await res.json();
      router.push(`/problems/${slug}/attempt/${attempt.id}`);
    } catch {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-muted)]">Problem not found.</p>
        <Link href="/problems" className="text-[var(--accent)] mt-4 inline-block">
          ← Back to problems
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/problems"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 inline-block"
      >
        ← Back to problems
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{problem.title}</h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded border diff-${problem.difficulty.toLowerCase()}`}
        >
          {problem.difficulty}
        </span>
      </div>

      <p className="text-[var(--text-secondary)] mb-6">{problem.description}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requirements */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="font-semibold mb-3">Functional Requirements</h2>
          <ul className="space-y-2">
            {problem.requirements.map((req, i) => (
              <li
                key={i}
                className="text-sm text-[var(--text-secondary)] flex gap-2"
              >
                <span className="text-[var(--accent)]">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Constraints */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="font-semibold mb-3">Constraints</h2>
          <ul className="space-y-2">
            {problem.constraints.map((con, i) => (
              <li
                key={i}
                className="text-sm text-[var(--text-secondary)] flex gap-2"
              >
                <span className="text-[var(--warning)]">•</span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Rubric */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 mb-8">
        <h2 className="font-semibold mb-3">Evaluation Rubric</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Your submission will be evaluated on these dimensions:
        </p>
        <div className="space-y-3">
          {problem.rubricDimensions.map((dim) => (
            <div key={dim.name} className="flex items-start gap-3">
              <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded mt-0.5 shrink-0">
                {dim.weight}%
              </span>
              <div>
                <p className="text-sm font-medium">{dim.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {dim.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start attempt */}
      <button
        onClick={startAttempt}
        disabled={starting}
        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {starting ? "Starting..." : "Start New Attempt"}
      </button>

      {/* Previous attempts */}
      {attempts.length > 0 && (() => {
        const chronological = [...attempts].sort(
          (a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
        );

        let lastScore: number | null = null;
        const attemptsWithMeta = chronological.map((att, index) => {
          const currentScore =
            att.latestSubmission?.evaluation?.overallScore != null
              ? Math.round(att.latestSubmission.evaluation.overallScore)
              : null;

          let delta: number | null = null;
          if (currentScore !== null && lastScore !== null) {
            delta = currentScore - lastScore;
          }
          if (currentScore !== null) {
            lastScore = currentScore;
          }

          return {
            att,
            attemptNumber: index + 1,
            score: currentScore,
            delta,
          };
        });

        const displayAttempts = [...attemptsWithMeta].reverse();

        return (
          <div className="mt-8">
            <h2 className="font-semibold mb-3">Previous Attempts</h2>
            <div className="space-y-2">
              {displayAttempts.map(({ att, attemptNumber, score, delta }) => (
                <Link key={att.id} href={`/problems/${slug}/attempt/${att.id}`}>
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--bg-card-hover)] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                        Attempt {attemptNumber}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded status-${att.status.toLowerCase()}`}
                      >
                        {att.status}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {new Date(att.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {score !== null ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold font-mono ${
                            score >= 70
                              ? "text-[var(--success)]"
                              : score >= 40
                                ? "text-[var(--warning)]"
                                : "text-[var(--danger)]"
                          }`}
                        >
                          {score}/100
                        </span>
                        {delta !== null && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                              delta > 0
                                ? "text-[var(--success)] bg-[#052e16] border border-[#14532d]"
                                : delta < 0
                                  ? "text-[var(--danger)] bg-[#450a0a] border border-[#7f1d1d]"
                                  : "text-[var(--text-muted)] bg-[var(--bg-secondary)]"
                            }`}
                          >
                            {delta > 0
                              ? `↑ +${delta}`
                              : delta < 0
                                ? `↓ ${delta}`
                                : `→ 0`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        {att.status === "Draft" ? "In Draft" : "In Progress"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
