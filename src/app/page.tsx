import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">
        LLD Practice Platform
      </h1>
      <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-2">
        Practice Low-Level Design problems and get structured, rubric-based
        feedback on your designs.
      </p>
      <p className="text-sm text-[var(--text-muted)] max-w-xl mb-8">
        Choose a problem → Design your solution → Submit → Receive per-dimension
        feedback → Track your improvement across attempts.
      </p>

      <Link
        href="/problems"
        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Browse Problems
      </Link>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <div className="text-2xl mb-2">📝</div>
          <h3 className="font-semibold mb-1">Submit Designs</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Write structured text describing your classes, responsibilities, and
            relationships.
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold mb-1">Get Feedback</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Receive rubric-based, evidence-linked feedback on design quality —
            not just a score.
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-semibold mb-1">Track Progress</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            See your improvement across attempts with persistent history and
            feedback trends.
          </p>
        </div>
      </div>
    </div>
  );
}
