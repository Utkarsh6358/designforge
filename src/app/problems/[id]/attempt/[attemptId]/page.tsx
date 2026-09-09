"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface FeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

interface Evaluation {
  id: string;
  status: string;
  overallScore: number | null;
  feedback: FeedbackItem[];
}

interface Submission {
  id: string;
  version: number;
  content: string;
  isDraft: boolean;
  evaluation: Evaluation | null;
  createdAt: string;
}

interface AttemptDetail {
  id: string;
  problemId: string;
  status: string;
  problem: {
    id: string;
    title: string;
    slug: string;
    requirements: string[];
    constraints: string[];
    rubricDimensions: { name: string; description: string }[];
  };
  submissions: Submission[];
}

const SECTION_PLACEHOLDERS = {
  classes:
    "List your classes/interfaces. Example:\n- ParkingLot: Main system entry point\n- Floor: Represents a single parking floor\n- ParkingSpot: Individual spot (abstract base)\n- Vehicle: Base class for vehicles",
  responsibilities:
    "Describe what each class is responsible for. Example:\n- ParkingLot: Manages floors, handles entry/exit\n- Floor: Tracks available spots, assigns spots by vehicle type\n- ParkingSpot: Knows its size, availability, and occupying vehicle",
  relationships:
    "Describe how classes relate. Example:\n- ParkingLot HAS-MANY Floor (composition)\n- Floor HAS-MANY ParkingSpot (composition)\n- ParkingSpot uses Vehicle (association)\n- FeeCalculator implements PricingStrategy (strategy pattern)",
  designDecisions:
    "Explain your key design choices. Example:\n- Used Strategy pattern for FeeCalculator because pricing rules vary by vehicle type and could change independently\n- Made ParkingSpot abstract with CarSpot/BikeSpot subclasses for type-safe spot allocation\n- Chose composition over inheritance for Floor→Spot to allow flexible spot configurations",
};

export default function AttemptPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const slug = params.id as string;

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [classes, setClasses] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [relationships, setRelationships] = useState("");
  const [designDecisions, setDesignDecisions] = useState("");

  const handleRetry = async (fork: boolean) => {
    if (!attempt) return;
    setRetrying(true);
    try {
      const pId = attempt.problemId || attempt.problem.id;
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: pId,
          ...(fork ? { forkFromAttemptId: attempt.id } : {}),
        }),
      });
      const newAttempt = await res.json();
      router.push(`/problems/${slug}/attempt/${newAttempt.id}`);
    } catch (err) {
      console.error("Retry failed:", err);
      setRetrying(false);
    }
  };

  const fetchAttempt = useCallback(async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}`);
      const data = await res.json();
      setAttempt(data);

      // Load latest submission content if exists
      if (data.submissions && data.submissions.length > 0) {
        const latest = data.submissions[0];
        try {
          const content = JSON.parse(latest.content);
          setClasses(content.classes || "");
          setResponsibilities(content.responsibilities || "");
          setRelationships(content.relationships || "");
          setDesignDecisions(content.designDecisions || "");
        } catch {
          // Content might not be valid JSON
        }
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchAttempt();
  }, [fetchAttempt]);

  const getContent = () => ({
    classes,
    responsibilities,
    relationships,
    designDecisions,
  });

  const saveDraft = async () => {
    setSaving(true);
    try {
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          content: getContent(),
          isDraft: true,
        }),
      });
      setLastSaved(new Date().toLocaleTimeString());
      await fetchAttempt();
    } finally {
      setSaving(false);
    }
  };

  const submitFinal = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          content: getContent(),
          isDraft: false,
        }),
      });
      const submission = await res.json();

      // Trigger evaluation
      setSubmitting(false);
      setEvaluating(true);
      await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id }),
      });

      await fetchAttempt();
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setSubmitting(false);
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-[var(--text-muted)]">Loading attempt...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-muted)]">Attempt not found.</p>
      </div>
    );
  }

  const latestSubmission = attempt.submissions?.[0];
  const evaluation = latestSubmission?.evaluation;
  const isCompleted = attempt.status === "Completed" || attempt.status === "Failed";
  const isEvaluating = evaluating || attempt.status === "Evaluating";
  const canEdit = (attempt.status === "Draft" || attempt.status === "Submitted") && !isEvaluating;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href={`/problems/${slug}`}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ← {attempt.problem.title}
        </Link>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded status-${attempt.status.toLowerCase()}`}
        >
          {attempt.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Requirements (reference) */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 sticky top-4">
            <h3 className="font-semibold mb-3 text-sm">Requirements</h3>
            <ul className="space-y-1.5">
              {attempt.problem.requirements.map((req, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--text-secondary)] flex gap-1.5"
                >
                  <span className="text-[var(--accent)] shrink-0">•</span>
                  {req}
                </li>
              ))}
            </ul>
            <h3 className="font-semibold mb-2 mt-4 text-sm">Constraints</h3>
            <ul className="space-y-1.5">
              {attempt.problem.constraints.map((con, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--text-muted)] flex gap-1.5"
                >
                  <span className="text-[var(--warning)] shrink-0">•</span>
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Editor or Feedback */}
        <div className="lg:col-span-2">
          {/* Evaluation in progress state */}
          {isEvaluating && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--success)] bg-[#052e16] border border-[#14532d] px-3 py-1 rounded-full">
                <span>✓</span> Submitted
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span> Evaluation in progress...
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                This usually takes a few seconds.
              </p>
            </div>
          )}

          {/* Editor sections */}
          {canEdit && (
            <div className="space-y-4">
              {(
                [
                  ["classes", "Classes / Interfaces", classes, setClasses],
                  [
                    "responsibilities",
                    "Responsibilities",
                    responsibilities,
                    setResponsibilities,
                  ],
                  [
                    "relationships",
                    "Relationships",
                    relationships,
                    setRelationships,
                  ],
                  [
                    "designDecisions",
                    "Design Decisions & Trade-offs",
                    designDecisions,
                    setDesignDecisions,
                  ],
                ] as const
              ).map(([key, label, value, setter]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1.5">
                    {label}
                  </label>
                  <textarea
                    rows={6}
                    value={value}
                    onChange={(e) =>
                      (setter as React.Dispatch<React.SetStateAction<string>>)(
                        e.target.value
                      )
                    }
                    placeholder={
                      SECTION_PLACEHOLDERS[
                        key as keyof typeof SECTION_PLACEHOLDERS
                      ]
                    }
                    className="w-full"
                  />
                </div>
              ))}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={submitFinal}
                  disabled={submitting || evaluating}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit for Evaluation"}
                </button>
                {submitting && (
                  <span className="text-xs text-[var(--text-muted)] animate-pulse">
                    Submitting design...
                  </span>
                )}
                {lastSaved && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Last saved: {lastSaved}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Feedback display */}
          {evaluation && isCompleted && (
            <div className="space-y-4">
              {/* Overall score */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--success)] bg-[#052e16] border border-[#14532d] px-3 py-1 rounded-full">
                    <span>✓</span> Evaluation Complete
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded status-${evaluation.status.toLowerCase()}`}
                  >
                    {evaluation.status}
                  </span>
                </div>

                <div className="mb-3">
                  <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium block">
                    Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-3xl font-extrabold ${
                        (evaluation.overallScore || 0) >= 70
                          ? "text-[var(--success)]"
                          : (evaluation.overallScore || 0) >= 40
                            ? "text-[var(--warning)]"
                            : "text-[var(--danger)]"
                      }`}
                    >
                      {Math.round(evaluation.overallScore || 0)}
                    </span>
                    <span className="text-lg text-[var(--text-muted)] font-normal">
                      {" "}/ 100
                    </span>
                  </div>
                </div>

                <div className="score-bar">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${evaluation.overallScore || 0}%`,
                      backgroundColor:
                        (evaluation.overallScore || 0) >= 70
                          ? "var(--success)"
                          : (evaluation.overallScore || 0) >= 40
                            ? "var(--warning)"
                            : "var(--danger)",
                    }}
                  />
                </div>
              </div>

              {/* Per-dimension feedback */}
              {evaluation.feedback.map((fb, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{fb.criterion}</h4>
                    <span className="text-sm font-mono">
                      {fb.score}/{fb.maxScore}
                    </span>
                  </div>
                  <div className="score-bar mb-3">
                    <div
                      className="score-bar-fill"
                      style={{
                        width: `${(fb.score / fb.maxScore) * 100}%`,
                        backgroundColor:
                          fb.score / fb.maxScore >= 0.7
                            ? "var(--success)"
                            : fb.score / fb.maxScore >= 0.4
                              ? "var(--warning)"
                              : "var(--danger)",
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)] text-xs font-medium">
                        EVIDENCE
                      </span>
                      <p className="text-[var(--text-secondary)]">
                        {fb.evidence}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs font-medium">
                        CONCERN
                      </span>
                      <p className="text-[var(--text-secondary)]">
                        {fb.concern}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs font-medium">
                        SUGGESTION
                      </span>
                      <p className="text-[var(--text-secondary)]">
                        {fb.suggestion}
                      </p>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Confidence: {(fb.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}

              {/* Try again / Continue options */}
              <div className="pt-4 border-t border-[var(--border)] mt-6">
                <p className="text-xs text-[var(--text-secondary)] mb-3 font-medium">
                  Ready to improve? Choose how you would like to proceed:
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleRetry(true)}
                    disabled={retrying}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>{retrying ? "Creating..." : "Continue with this design"}</span>
                  </button>
                  <button
                    onClick={() => handleRetry(false)}
                    disabled={retrying}
                    className="bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 text-[var(--text-primary)] px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>🆕</span>
                    <span>Start fresh from zero</span>
                  </button>
                  <Link
                    href={`/problems/${slug}`}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-auto"
                  >
                    ← Back to problem
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
