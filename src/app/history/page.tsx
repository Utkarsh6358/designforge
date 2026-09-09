"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

interface StartModalState {
  isOpen: boolean;
  problemTitle: string;
  problemId: string;
  problemSlug: string;
  latestAttemptId?: string;
  latestAttemptNumber?: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    onConfirm: async () => {},
  });

  const [startModal, setStartModal] = useState<StartModalState>({
    isOpen: false,
    problemTitle: "",
    problemId: "",
    problemSlug: "",
  });

  const fetchAttempts = async () => {
    try {
      const res = await fetch("/api/attempts");
      const data = await res.json();
      setAttempts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  // Handler to start a new attempt (fresh or forked)
  const handleStartAttempt = async (
    problemId: string,
    problemSlug: string,
    forkFromAttemptId?: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          ...(forkFromAttemptId ? { forkFromAttemptId } : {}),
        }),
      });
      const attempt = await res.json();
      setStartModal((prev) => ({ ...prev, isOpen: false }));
      startTransition(() => {
        router.push(`/problems/${problemSlug}/attempt/${attempt.id}`);
      });
    } catch (err) {
      console.error("Failed to create attempt:", err);
      setActionLoading(false);
    }
  };

  // Delete a single attempt
  const handleDeleteAttempt = (attemptId: string, attemptNumber: number, problemTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Attempt ${attemptNumber}`,
      message: `Are you sure you want to delete Attempt ${attemptNumber} for "${problemTitle}"? This will permanently remove its submission and evaluation feedback.`,
      confirmText: "Delete Attempt",
      danger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/attempts/${attemptId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
          }
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Delete all attempts for a problem
  const handleDeleteProblemHistory = (problemId: string, problemTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Clear History for ${problemTitle}`,
      message: `Are you sure you want to delete all attempts for "${problemTitle}"? All submissions, evaluation scores, and feedback for this problem will be erased.`,
      confirmText: "Clear Problem History",
      danger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/attempts?problemId=${problemId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setAttempts((prev) => prev.filter((a) => a.problemId !== problemId));
          }
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Delete all attempts for the user
  const handleDeleteAllHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Attempt History",
      message:
        "Are you sure you want to delete all your practice history across all problems? This action cannot be undone.",
      confirmText: "Clear All History",
      danger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch("/api/attempts?all=true", {
            method: "DELETE",
          });
          if (res.ok) {
            setAttempts([]);
          }
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

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
        acc[att.problemTitle] = {
          problemId: att.problemId,
          slug: att.problemSlug,
          attempts: [],
        };
      }
      acc[att.problemTitle].attempts.push(att);
      return acc;
    },
    {} as Record<
      string,
      { problemId: string; slug: string; attempts: AttemptSummary[] }
    >
  );

  return (
    <div>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
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

        {attempts.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAllHistory}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--danger)] bg-[#450a0a]/40 border border-[#7f1d1d]/60 hover:bg-[#450a0a] hover:border-[var(--danger)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Clear All History
            </button>
          </div>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          <p className="text-[var(--text-muted)] mb-4">
            No attempts yet. Start practicing!
          </p>
          <Link
            href="/problems"
            className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Browse Problems →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(
            ([title, { problemId, slug, attempts: atts }]) => {
              // Sort chronologically (oldest to newest) to assign attempt numbers & compute deltas
              const chronological = [...atts].sort(
                (a, b) =>
                  new Date(a.startedAt).getTime() -
                  new Date(b.startedAt).getTime()
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

              // Display newest attempt first (e.g. Attempt 3, Attempt 2, Attempt 1)
              const displayAttempts = [...attemptsWithMeta].reverse();
              const latestAttempt = displayAttempts[0];

              return (
                <div
                  key={title}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm"
                >
                  {/* Problem Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border)]">
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

                    {/* Problem Actions: Retry options & Clear problem history */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          setStartModal({
                            isOpen: true,
                            problemTitle: title,
                            problemId,
                            problemSlug: slug,
                            latestAttemptId: latestAttempt?.att.id,
                            latestAttemptNumber: latestAttempt?.attemptNumber,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-all shadow-sm cursor-pointer"
                      >
                        <span>Try Again</span>
                        <span>→</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProblemHistory(problemId, title)}
                        title="Clear history for this problem"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[#450a0a]/30 border border-transparent hover:border-[#7f1d1d]/40 transition-all cursor-pointer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    </div>
                  </div>

                  {/* Attempts List */}
                  <div className="space-y-2.5">
                    {displayAttempts.map(
                      ({ att, attemptNumber, score, delta }) => (
                        <div
                          key={att.id}
                          className="bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)]/50 rounded-lg p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          {/* Left: Attempt Number & metadata */}
                          <Link
                            href={`/problems/${slug}/attempt/${att.id}`}
                            className="flex items-center gap-3 flex-1"
                          >
                            <span className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
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
                          </Link>

                          {/* Right: Scores, Continue action, Delete action */}
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

                            {/* Action: Continue from this attempt */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartAttempt(problemId, slug, att.id);
                              }}
                              disabled={actionLoading}
                              title={`Start new attempt based on Attempt ${attemptNumber}'s design`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-xs text-[var(--text-secondary)] transition-all font-medium cursor-pointer"
                            >
                              <span>🔄</span>
                              <span className="hidden md:inline">Continue from this</span>
                            </button>

                            {/* Action: Delete attempt */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttempt(att.id, attemptNumber, title);
                              }}
                              disabled={actionLoading}
                              title="Delete this attempt"
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[#450a0a]/30 transition-all cursor-pointer"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>

                            {/* Action: View attempt */}
                            <Link
                              href={`/problems/${slug}/attempt/${att.id}`}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors pl-1"
                            >
                              →
                            </Link>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Start / Try Again Choice Modal */}
      {startModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                Start Practicing
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {startModal.problemTitle}
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Continue from previous */}
              {startModal.latestAttemptId && (
                <button
                  onClick={() =>
                    handleStartAttempt(
                      startModal.problemId,
                      startModal.problemSlug,
                      startModal.latestAttemptId
                    )
                  }
                  disabled={actionLoading}
                  className="w-full text-left p-4 rounded-xl border border-[var(--accent)]/40 hover:border-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/15 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-[var(--accent)]">
                    <span>🔄 Continue from Previous Test</span>
                    {startModal.latestAttemptNumber && (
                      <span className="text-xs bg-[var(--accent)]/20 px-2 py-0.5 rounded-full">
                        Attempt {startModal.latestAttemptNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    Pre-fills your previous classes, relationships, and design
                    decisions so you can iterate on feedback.
                  </p>
                </button>
              )}

              {/* Option 2: Start new from zero */}
              <button
                onClick={() =>
                  handleStartAttempt(
                    startModal.problemId,
                    startModal.problemSlug
                  )
                }
                disabled={actionLoading}
                className="w-full text-left p-4 rounded-xl border border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--bg-primary)] hover:bg-[var(--bg-card-hover)] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
                  <span>🆕 Start New Test from Zero</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Start with a completely clean slate and build your low-level
                  design from scratch.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStartModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  confirmModal.danger
                    ? "bg-[#450a0a] text-[var(--danger)] border border-[#7f1d1d]"
                    : "bg-[var(--bg-secondary)] text-[var(--accent)]"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {confirmModal.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer ${
                  confirmModal.danger
                    ? "bg-[var(--danger)] hover:bg-[#dc2626]"
                    : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
                }`}
              >
                {actionLoading ? "Processing..." : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
