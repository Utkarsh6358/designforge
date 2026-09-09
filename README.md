# LLD Practice Platform

A focused, full-stack practice platform for Low-Level Design (LLD) problems featuring structured, rubric-based feedback, versioned iteration, and swappable evaluation engines.

**Assignment:** CipherSchools Hiring Assignment — 2-Day Engineering Prototype  
**Author:** Utkarsh Kumar  
**Live Demo:** [DesignForge on Vercel](https://designforge-git-main-utkarsh-kumars-projects-0743eada.vercel.app)

---

## 🎯 The Core Practice Loop

The platform implements the complete end-to-end learning lifecycle:

$$\text{Problem Catalog} \longrightarrow \text{Start Attempt} \longrightarrow \text{Design \& Submit} \longrightarrow \text{Rubric Feedback} \longrightarrow \text{Iterate / Try Again} \longrightarrow \text{Progress History}$$

1. **Problem Selection:** Browse curated problems (*Parking Lot*, *Vending Machine*, *Elevator System*) with difficulty levels and tailored rubric dimensions.
2. **Structured Authoring:** Draft and submit solutions across four key dimensions: *Classes*, *Responsibilities*, *Relationships*, and *Design Decisions*.
3. **Composite Evaluation:** Solutions are evaluated deterministically (structural rules) and qualitatively (rubric analysis) with evidence, concerns, and actionable suggestions.
4. **Iterative Improvement:** Versioned submissions allow refining designs and tracking score progression across multiple attempts.

---

## 🚀 Quick Start (Local Setup)

```bash
# 1. Clone the repository
git clone https://github.com/Utkarsh6358/designforge.git
cd designforge

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Copy .env.example to .env (configured for Supabase PostgreSQL or local SQLite)
cp .env.example .env

# 4. Generate Prisma client & sync schema
npx prisma generate
npx prisma db push

# 5. Seed problem catalog & demo user
npx tsx prisma/seed.ts

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16 (App Router) | Unified React Server Components & API routes in a single repo |
| **Language** | TypeScript | Strict end-to-end type safety across schemas, evaluators, and UI |
| **Database** | PostgreSQL (Supabase) | Scalable relational database for production cloud deployment |
| **ORM** | Prisma 5 | Type-safe database queries, schema migrations, and relational modeling |
| **Styling** | Tailwind CSS | Clean, responsive dark-themed interface |
| **Testing** | Node.js Test Runner / tsx | Zero-dependency unit testing suite for evaluator engines |

---

## 📁 Project Structure

```
├── docs/
│   ├── RESEARCH.md          # Competitive analysis, PRD breakdown & gap analysis
│   └── DESIGN.md            # Domain model, state machines, API & lifecycle specs
├── prisma/
│   ├── schema.prisma        # PostgreSQL / Prisma database schema
│   └── seed.ts              # Seed data for 3 LLD problems + rubrics + demo user
├── src/
│   ├── app/                 # Next.js App Router (pages + API endpoints)
│   │   ├── api/
│   │   │   ├── attempts/    # Attempt creation & retrieval
│   │   │   ├── evaluations/ # Evaluation orchestration & idempotency
│   │   │   ├── problems/    # Problem catalog & rubric endpoints
│   │   │   ├── submissions/ # Immutable versioned submission handling
│   │   │   └── seed/        # Cloud database seeding endpoint
│   │   ├── problems/        # Catalog, problem detail, and interactive editor
│   │   └── history/         # Iteration history & score trend visualization
│   └── lib/
│       ├── prisma.ts        # Prisma singleton instance
│       └── evaluator/       # Strategy pattern evaluation architecture
│           ├── types.ts             # Evaluator interface & domain contracts
│           ├── rule-based-evaluator.ts   # Deterministic structural checks
│           ├── mock-ai-evaluator.ts      # Rubric-aware qualitative engine
│           └── composite-evaluator.ts    # Multi-engine merger with graceful degradation
├── __tests__/
│   └── evaluator.test.ts   # 57 unit tests covering evaluators & edge cases
├── AI_USAGE.md              # Transparent AI collaboration disclosure & decision log
└── README.md                # Project documentation
```

---

## 💡 Key Architectural Decisions

### 1. Evaluator as Strategy Pattern
The `Evaluator` interface defines a unified `evaluate(submission, rubric)` contract. `RuleBasedEvaluator` handles deterministic validation, while `MockAIEvaluator` / `RubricAIEvaluator` handles subjective quality. `CompositeEvaluator` orchestrates them, merging dimension feedback and degrading gracefully if AI services fail.

### 2. Immutable Versioned Submissions
Each draft or submission creates a new `Submission` record with an incremented `version` counter. Submissions are never mutated in place, preserving an accurate historical audit trail of learner iterations.

### 3. Decoupled Evaluation Lifecycle
`Evaluation` owns an explicit lifecycle (`Pending → Running → Completed / Failed / Partial`) independent of `Attempt`. In the MVP, evaluation executes synchronously within the API route, but the decoupled domain model ensures zero friction when transitioning to asynchronous background worker queues (e.g., BullMQ/Redis) at scale.

### 4. Problem-Specific Rubric Dimensions
Rather than generic boilerplate metrics, each problem features dedicated weighted dimensions (e.g., *State Machine Design* for Vending Machine, *Polymorphic Dispatch* for Parking Lot, *SCAN Scheduling* for Elevator).

---

## 🧪 Unit Testing

Run the evaluator test suite:

```bash
npx tsx __tests__/evaluator.test.ts
```

**Test Coverage (57 passed, 0 failed):**
- **RuleBasedEvaluator:** Structural completeness, section presence, relationship parsing, empty/sparse inputs.
- **MockAIEvaluator:** Rubric-specific dimensions, evidence linkage, score differentiation.
- **CompositeEvaluator:** Result merging, graceful degradation on engine failure, Strategy pattern swapping.
- **Edge Cases:** Empty submissions, malformed rubrics, missing dimensions.

---

## ☁️ Deployment

The project is configured for continuous deployment on **Vercel** connected to **Supabase PostgreSQL**:
- **Environment Variable:** Set `DATABASE_URL` in Vercel to your Supabase connection pooler string.
- **Build Command:** `prisma generate && next build`
- **Zero-Setup Seeding:** Available via `/api/seed` or the pre-configured `prisma/seed.ts` script.
