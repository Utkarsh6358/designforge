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

interface ConfirmModalState {
  isOpen: boolean;
  attemptId: string;
  attemptNumber: number;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState<ConfirmModalState>({
    isOpen: false,
    attemptId: "",
    attemptNumber: 1,
  });

  const loadData = () => {
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
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  const startAttempt = async (forkFromAttemptId?: string) => {
    if (!problem) return;
    setStarting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          ...(forkFromAttemptId ? { forkFromAttemptId } : {}),
        }),
      });
      const attempt = await res.json();
      router.push(`/problems/${slug}/attempt/${attempt.id}`);
    } catch {
      setStarting(false);
    }
  };

  const handleDeleteAttempt = async () => {
    if (!deleteModal.attemptId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/attempts/${deleteModal.attemptId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAttempts((prev) => prev.filter((a) => a.id !== deleteModal.attemptId));
      }
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, attemptId: "", attemptNumber: 1 });
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

  // Compute attempts metadata (chronological for numbering & score delta)
  const chronological = [...attempts].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
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
  const latestAttempt = displayAttempts[0];

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

      {/* Start / Continue Choice Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="font-semibold text-base mb-1 text-[var(--text-primary)]">
          {attempts.length > 0 ? "Ready for Another Attempt?" : "Start Practice"}
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {attempts.length > 0
            ? "Choose whether to continue with your existing architecture to address feedback, or start fresh from zero."
            : "Start your design workspace from scratch with structured low-level design templates."}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {latestAttempt ? (
            <>
              {/* Option A: Continue from previous attempt */}
              <button
                onClick={() => startAttempt(latestAttempt.att.id)}
                disabled={starting}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white px-5 py-3 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔄</span>
                <span>Continue from Attempt {latestAttempt.attemptNumber}</span>
              </button>

              {/* Option B: Start fresh from zero */}
              <button
                onClick={() => startAttempt()}
                disabled={starting}
                className="bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 text-[var(--text-primary)] px-5 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🆕</span>
                <span>Start New Test from Zero</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => startAttempt()}
              disabled={starting}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
            >
              {starting ? "Starting..." : "Start Practice (from Zero)"}
            </button>
          )}
        </div>
      </div>

      {/* Previous attempts */}
      {displayAttempts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg text-[var(--text-primary)]">
              Previous Attempts
            </h2>
            <Link
              href="/history"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              View Full History →
            </Link>
          </div>

          <div className="space-y-2.5">
            {displayAttempts.map(({ att, attemptNumber, score, delta }) => (
              <div
                key={att.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/50 rounded-lg p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
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
                      {att.status === "Draft" ? "In Draft" : "In Progress"}
                    </span>
                  )}

                  {/* Continue button */}
                  <button
                    onClick={() => startAttempt(att.id)}
                    disabled={starting}
                    title={`Start new attempt based on Attempt ${attemptNumber}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-xs text-[var(--text-secondary)] transition-all font-medium cursor-pointer"
                  >
                    <span>🔄</span>
                    <span className="hidden sm:inline">Continue from this</span>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() =>
                      setDeleteModal({
                        isOpen: true,
                        attemptId: att.id,
                        attemptNumber,
                      })
                    }
                    disabled={starting}
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

                  <Link
                    href={`/problems/${slug}/attempt/${att.id}`}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors pl-1"
                  >
                    →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl shrink-0 bg-[#450a0a] text-[var(--danger)] border border-[#7f1d1d]">
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
                  Delete Attempt {deleteModal.attemptNumber}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Are you sure you want to delete Attempt {deleteModal.attemptNumber}? This will permanently remove its design submission and AI evaluation scores.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, attemptId: "", attemptNumber: 1 })
                }
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAttempt}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--danger)] hover:bg-[#dc2626] transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? "Deleting..." : "Delete Attempt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
