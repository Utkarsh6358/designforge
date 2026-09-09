# LLD Practice Platform

A focused practice tool for Low-Level Design (LLD) problems with structured, rubric-based feedback.

**Assignment:** CipherSchools Hiring Assignment — 2-Day Engineering Prototype

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Create database and apply schema
npx prisma db push

# 4. Seed the database (3 problems + demo user)
npx tsx prisma/seed.ts

# 5. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo User

The platform uses a hardcoded demo user (`demo@lldpractice.com`) — no login required. This is a deliberate MVP decision: the assignment evaluates LLD and evaluation architecture, not authentication.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Unified frontend + API in one project |
| Language | TypeScript | Type safety across the full stack |
| Database | SQLite (via Prisma) | Zero-setup local development |
| ORM | Prisma | Type-safe database access, schema-first |
| Styling | Tailwind CSS | Rapid prototyping |

---

## Project Structure

```
├── docs/
│   ├── RESEARCH.md          # Research note (existing tools, gap analysis)
│   └── DESIGN.md            # Design note (domain model, architecture)
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data (3 problems + rubrics)
├── src/
│   ├── app/                 # Next.js pages + API routes
│   │   ├── api/             # REST API (problems, attempts, submissions, evaluations)
│   │   ├── problems/        # Problem catalog + detail + submission editor
│   │   └── history/         # Attempt history
│   └── lib/
│       ├── prisma.ts        # Prisma singleton
│       └── evaluator/       # Strategy pattern evaluator system
│           ├── types.ts             # Evaluator interface
│           ├── rule-based-evaluator.ts   # Deterministic checks
│           ├── mock-ai-evaluator.ts      # Mock AI (default)
│           └── composite-evaluator.ts    # Orchestrator
├── __tests__/
│   └── evaluator.test.ts   # Unit tests
├── AI_USAGE.md              # AI-assisted decisions log
└── README.md                # This file
```

---

## Key Design Decisions

### 1. Evaluator as Strategy Pattern
The `Evaluator` interface allows swapping between `RuleBasedEvaluator`, `MockAIEvaluator`, and future evaluators without touching the submission flow. `CompositeEvaluator` orchestrates multiple evaluators with graceful degradation.

### 2. Immutable Versioned Submissions
Each save creates a new `Submission` record (never mutates). This makes attempt history meaningful — you can compare v1 → v3 and see actual improvement.

### 3. Independent Evaluation Lifecycle
`Evaluation` has its own status (`Pending → Running → Completed → Failed`) separate from `Attempt`. A slow/failed AI call never loses the submission.

### 4. Problem-Specific Rubrics
Each problem has tailored rubric dimensions. A Parking Lot problem weights "vehicle type polymorphism" differently than an Elevator problem weights "state machine design."

---

## Running Tests

```bash
npx tsx __tests__/evaluator.test.ts
```

Tests cover:
- Rule-based evaluator: good/empty/sparse submissions, feedback structure
- Mock AI evaluator: rubric-aware feedback, score differentiation
- Composite evaluator: result merging, graceful degradation on AI failure, evaluator swapping
- Edge cases: empty submissions, empty rubric dimensions

---

## Limitations (MVP)

- **No real authentication** — uses a hardcoded demo user
- **Mock AI evaluator** — returns realistic but template-based feedback (real AI evaluator requires an OpenAI API key)
- **SQLite** — sufficient for single-user prototype, would need PostgreSQL/MongoDB for production
- **No real-time status updates** — evaluation runs synchronously in the API route
- **3 problems only** — enough to demonstrate the practice loop

---

## Future Extensions

The architecture supports these without major refactoring:
- Add `RubricAIEvaluator` (real OpenAI integration) by implementing the `Evaluator` interface
- Add `HumanEvaluator` or `PeerEvaluator` — same interface
- Replace demo auth with NextAuth/Auth.js
- Add diagram or code submission formats (new `format` type, same `Submission` model)
- Extract evaluation to a background worker for async processing
