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
      <h1 className="text-2xl font-bold mb-2">Attempt History</h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Review your past attempts and track improvement across problems.
      </p>

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
          {Object.entries(grouped).map(([title, { slug, attempts: atts }]) => (
            <div key={title}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold">
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

              {/* Score trend (simple inline display) */}
              {atts.filter((a) => a.latestSubmission?.evaluation?.overallScore != null)
                .length >= 2 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[var(--text-muted)]">
                    Score trend:
                  </span>
                  {atts
                    .filter(
                      (a) =>
                        a.latestSubmission?.evaluation?.overallScore != null
                    )
                    .reverse()
                    .map((a, i) => (
                      <span
                        key={a.id}
                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          (a.latestSubmission!.evaluation!.overallScore || 0) >=
                          70
                            ? "text-[var(--success)] bg-[#052e16]"
                            : (a.latestSubmission!.evaluation!.overallScore ||
                                0) >= 40
                              ? "text-[var(--warning)] bg-[#422006]"
                              : "text-[var(--danger)] bg-[#450a0a]"
                        }`}
                      >
                        {i > 0 && "→ "}
                        {a.latestSubmission!.evaluation!.overallScore?.toFixed(
                          0
                        )}
                        %
                      </span>
                    ))}
                </div>
              )}

              <div className="space-y-2">
                {atts.map((att) => (
                  <Link
                    key={att.id}
                    href={`/problems/${slug}/attempt/${att.id}`}
                  >
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded status-${att.status.toLowerCase()}`}
                          >
                            {att.status}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {new Date(att.startedAt).toLocaleDateString()}{" "}
                            {new Date(att.startedAt).toLocaleTimeString()}
                          </span>
                          {att.latestSubmission && (
                            <span className="text-xs text-[var(--text-muted)]">
                              v{att.latestSubmission.version}
                            </span>
                          )}
                        </div>
                        {att.latestSubmission?.evaluation?.overallScore !=
                          null && (
                          <span
                            className={`text-sm font-bold ${
                              att.latestSubmission.evaluation.overallScore >= 70
                                ? "text-[var(--success)]"
                                : att.latestSubmission.evaluation
                                      .overallScore >= 40
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--danger)]"
                            }`}
                          >
                            {att.latestSubmission.evaluation.overallScore.toFixed(
                              1
                            )}
                            %
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
