import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DesignForge",
  description:
    "Practice Low-Level Design problems and get structured, rubric-based feedback on your designs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <nav className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              DesignForge
            </Link>
            <div className="flex gap-6">
              <Link
                href="/problems"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Problems
              </Link>
              <Link
                href="/history"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                History
              </Link>
            </div>
            <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-3 py-1 rounded-full">
              Demo User
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
