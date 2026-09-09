"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
}

interface AttemptSummary {
  id: string;
  problemId: string;
  problemTitle: string;
  problemSlug: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  latestSubmission?: {
    version: number;
    evaluation?: {
      status: string;
      overallScore: number | null;
      feedback: FeedbackItem[];
    } | null;
  } | null;
}

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attempts")
      .then((r) => r.json())
      .then((data) => {
        setAttempts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-[var(--text-muted)]">Loading history...</p>
      </div>
    );
  }

  // Group by problem
  const grouped = attempts.reduce(
    (acc, att) => {
      if (!acc[att.problemTitle]) {
        acc[att.problemTitle] = { slug: att.problemSlug, attempts: [] };
      }
      acc[att.problemTitle].attempts.push(att);
      return acc;
    },
    {} as Record<string, { slug: string; attempts: AttemptSummary[] }>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">
          Attempt History
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Track your design improvement across iterations and problems.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--accent)] font-medium">
          <span>Practice</span>
          <span className="text-[var(--text-muted)]">→</span>
          <span>Feedback</span>
          <span className="text-[var(--text-muted)]">→</span>
          <span>Improve</span>
          <span className="text-[var(--text-muted)]">→</span>
          <span>Try again</span>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)] mb-4">
            No attempts yet. Start practicing!
          </p>
          <Link
            href="/problems"
            className="text-[var(--accent)] hover:underline"
          >
            Browse Problems →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([title, { slug, attempts: atts }]) => {
            // Sort chronologically (oldest to newest) to assign attempt numbers & compute deltas
            const chronological = [...atts].sort(
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

            // Display newest attempt first (e.g. Attempt 2, then Attempt 1)
            const displayAttempts = [...attemptsWithMeta].reverse();

            return (
              <div
                key={title}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      <Link
                        href={`/problems/${slug}`}
                        className="hover:text-[var(--accent)] transition-colors"
                      >
                        {title}
                      </Link>
                    </h2>
                    <span className="text-xs text-[var(--text-muted)]">
                      {atts.length} attempt{atts.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <Link
                    href={`/problems/${slug}`}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Try Again →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {displayAttempts.map(
                    ({ att, attemptNumber, score, delta }) => (
                      <Link
                        key={att.id}
                        href={`/problems/${slug}/attempt/${att.id}`}
                        className="block group"
                      >
                        <div className="bg-[var(--bg-primary)] border border-[var(--border)] group-hover:border-[var(--accent)] rounded-lg p-3.5 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm text-[var(--text-primary)]">
                              Attempt {attemptNumber}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded status-${att.status.toLowerCase()}`}
                            >
                              {att.status}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(att.startedAt).toLocaleDateString()}{" "}
                              {new Date(att.startedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
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
                                {att.status === "Draft"
                                  ? "In Draft"
                                  : "In Progress"}
                              </span>
                            )}
                            <span className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] text-sm transition-colors">
                              →
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
