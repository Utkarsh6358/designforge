# LLD Practice Platform — Implementation Plan

**Assignment:** CipherSchools Hiring Assignment (2-Day Prototype)
**Stack:** Next.js 15 (App Router) + Prisma + MongoDB + Auth.js v5 + OpenAI API

---

## Phase 1: Documents (Research Note + Design Note)

### 1.1 Research Note (`docs/RESEARCH.md`)
A 1–2 page document covering:
- **The Learner Problem:** LLD is hard to self-evaluate; many valid solutions exist; no structured feedback loop
- **Existing Tools Researched:**
  - **LLDcoding** — interactive IDE, interview-focused, but only validates code correctness (compiles/passes tests), not design quality
  - **Hello Interview** — pragmatic guides, but purely educational content, no practice + feedback loop
  - **AlgoMaster** — systematic OOP/patterns curriculum, but MCQ-style evaluation, not design submission
  - **LLDCanvas** — UML + code in one space, but no AI-powered design quality feedback
  - **Awesome LLD (GitHub)** — community index, static resources, no interactive practice
- **Gap Analysis:** No existing tool offers: `practice problem → submit design → AI rubric feedback → track improvement`
- **Product Direction:** Build the missing feedback loop — structured submission + rubric-based AI evaluation + attempt history

### 1.2 Design Note (`docs/DESIGN.md`)
Detailed design document covering:
- **MVP Scope & User Flow** (with Mermaid diagram)
- **Domain Model** — class diagram with all entities
- **Key Design Patterns:**
  - Strategy Pattern for `Evaluator` interface (swappable evaluators)
  - Immutable `Submission` with versioning
  - Independent `Evaluation` lifecycle (decoupled from Attempt)
  - Draft support before final submission
- **Evaluation Architecture** — deterministic checks + AI-assisted judgment
- **API Design** — RESTful endpoints via Next.js API routes
- **Trade-off Decisions** — structured text vs diagrams vs code, monolith vs microservices, etc.

---

## Phase 2: Project Setup

### 2.1 Initialize Next.js Project
```
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

> [!NOTE]
> Using Tailwind here since Next.js scaffolding includes it by default with create-next-app and it speeds up prototyping significantly for a 2-day assignment. Will confirm with user.

### 2.2 Install Dependencies
```
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter
npm install openai zod uuid
npm install -D @types/uuid
```

### 2.3 Project Structure
```
d:\Assignment_Project\
├── docs/
│   ├── RESEARCH.md            # [NEW] Research note
│   └── DESIGN.md              # [NEW] Design note
├── prisma/
│   └── schema.prisma          # [NEW] Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx         # [NEW] Root layout with providers
│   │   ├── page.tsx           # [NEW] Landing page
│   │   ├── globals.css        # [NEW] Global styles
│   │   ├── auth/
│   │   │   └── signin/page.tsx # [NEW] Sign-in page
│   │   ├── problems/
│   │   │   ├── page.tsx       # [NEW] Problem catalog
│   │   │   └── [id]/
│   │   │       ├── page.tsx   # [NEW] Problem detail + attempt
│   │   │       └── attempt/
│   │   │           └── [attemptId]/
│   │   │               └── page.tsx  # [NEW] Submission editor
│   │   ├── history/
│   │   │   └── page.tsx       # [NEW] Attempt history
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # [NEW] Auth handler
│   │       ├── problems/route.ts            # [NEW] GET problems
│   │       ├── attempts/route.ts            # [NEW] POST create attempt
│   │       ├── submissions/route.ts         # [NEW] POST submit / PUT draft
│   │       └── evaluations/route.ts         # [NEW] POST trigger evaluation
│   ├── lib/
│   │   ├── prisma.ts          # [NEW] Prisma singleton
│   │   ├── auth.ts            # [NEW] Auth.js config
│   │   ├── auth.config.ts     # [NEW] Edge-compatible auth config
│   │   └── evaluator/
│   │       ├── types.ts       # [NEW] Evaluator interface + types
│   │       ├── rubric-ai-evaluator.ts   # [NEW] AI-powered evaluator
│   │       ├── rule-based-evaluator.ts  # [NEW] Deterministic checks
│   │       └── composite-evaluator.ts   # [NEW] Combines both
│   ├── components/
│   │   ├── Navbar.tsx         # [NEW] Navigation bar
│   │   ├── ProblemCard.tsx    # [NEW] Problem catalog card
│   │   ├── SubmissionEditor.tsx  # [NEW] Text/code editor
│   │   ├── FeedbackDisplay.tsx   # [NEW] Rubric feedback view
│   │   ├── AttemptHistory.tsx    # [NEW] History timeline
│   │   ├── StatusBadge.tsx       # [NEW] Status indicator
│   │   └── providers/
│   │       └── SessionProvider.tsx  # [NEW] Auth session provider
│   └── seed/
│       └── problems.ts       # [NEW] Seed data for 5 LLD problems
├── __tests__/
│   ├── evaluator.test.ts      # [NEW] Evaluator unit tests
│   ├── submission.test.ts     # [NEW] Submission logic tests
│   └── api.test.ts            # [NEW] API endpoint tests
├── README.md                  # [NEW] Setup + decisions + limitations
├── AI_USAGE.md                # [NEW] AI-assisted decisions log
└── PRD-LLD-Practice-Platform.md  # [EXISTS] Provided PRD
```

---

## Phase 3: Database Schema (Prisma)

### [NEW] `prisma/schema.prisma`

Core models:

| Model | Key Fields | Notes |
|-------|-----------|-------|
| `User` | id, name, email, sessions | Auth.js managed |
| `Problem` | id, title, slug, description, requirements[], constraints[], difficulty, rubric | Seeds 3–5 problems |
| `Attempt` | id, userId, problemId, status (Draft/Submitted/Evaluating/Completed/Failed), startedAt, submittedAt | Lifecycle state machine |
| `Submission` | id, attemptId, version, content (JSON), format, isDraft, createdAt | Immutable + versioned |
| `Evaluation` | id, submissionId, evaluatorType, status (Pending/Running/Completed/Failed), startedAt, completedAt, overallScore | Independent lifecycle |
| `Feedback` | id, evaluationId, criterion, score, maxScore, evidence, concern, suggestion, confidence | Per-dimension structured output |
| `Rubric` | id, problemId, dimensions[] (JSON) | Problem-specific rubric definitions |

**Key design:**
- `Submission` is immutable — new drafts/resubmissions create new records with incremented `version`
- `Evaluation` has its own status independent of `Attempt` — failed evaluations don't corrupt submissions
- `Rubric` is problem-specific with JSON dimensions array for flexibility

---

## Phase 4: Core Domain Logic

### 4.1 Evaluator Interface (Strategy Pattern)

```typescript
// src/lib/evaluator/types.ts
interface Evaluator {
  evaluate(submission: Submission, rubric: Rubric): Promise<EvaluationResult>;
}

interface EvaluationResult {
  overallScore: number;
  feedback: FeedbackItem[];
  evaluatorType: string;
}

interface FeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}
```

### 4.2 Concrete Evaluators

| Evaluator | Responsibility |
|-----------|---------------|
| `RuleBasedEvaluator` | Deterministic checks: required fields present, structural completeness, class count, relationship density |
| `RubricAIEvaluator` | AI-powered judgment: class responsibility quality, SOLID analysis, trade-off reasoning, extensibility |
| `CompositeEvaluator` | Orchestrates both, merges results, handles failures gracefully |

### 4.3 AI Evaluation Design
- Fixed rubric dimensions per problem (not open-ended prompting)
- Structured output schema via OpenAI function calling / JSON mode
- Each dimension evaluated independently with evidence pointers
- Confidence scores to flag uncertain judgments
- **Fallback:** If AI call fails, rule-based results are still returned with evaluation marked as `Partial`

---

## Phase 5: API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/problems` | List all problems with metadata |
| `GET` | `/api/problems/[id]` | Get problem detail + rubric |
| `POST` | `/api/attempts` | Start new attempt for a problem |
| `GET` | `/api/attempts` | List user's attempts (with filters) |
| `GET` | `/api/attempts/[id]` | Get attempt with submissions + evaluations |
| `POST` | `/api/submissions` | Save draft or submit final |
| `POST` | `/api/evaluations` | Trigger evaluation for a submission |
| `GET` | `/api/evaluations/[id]` | Poll evaluation status + feedback |
| `GET` | `/api/history` | User's attempt history with trends |

**Idempotency:** POST evaluation checks if a pending/running evaluation already exists for the submission — prevents duplicates on double-click/retry.

---

## Phase 6: Frontend Pages

### 6.1 Landing Page (`/`)
- Hero section with platform description
- CTA to browse problems
- Dark theme, glassmorphism cards, smooth animations

### 6.2 Problem Catalog (`/problems`)
- Grid of problem cards with difficulty badges
- Each card: title, brief description, difficulty, attempt count
- Click to view problem detail

### 6.3 Problem Detail (`/problems/[id]`)
- Full problem description, requirements, constraints
- Rubric dimensions shown (so learner knows evaluation criteria)
- "Start New Attempt" button
- Previous attempts section (if any)

### 6.4 Submission Editor (`/problems/[id]/attempt/[attemptId]`)
- Split-pane: problem requirements (left) + editor (right)
- Structured text editor with sections: Classes, Responsibilities, Relationships, Design Decisions
- Auto-save drafts
- "Submit for Evaluation" button
- Status transitions: `Draft → Submitted → Evaluating → Completed`

### 6.5 Feedback View (same page, post-evaluation)
- Overall score with visual gauge
- Per-dimension breakdown: criterion → score bar → evidence → concern → suggestion
- Expandable detail cards
- "Try Again" button to start new attempt

### 6.6 History (`/history`)
- Timeline of all attempts grouped by problem
- Score trend chart (sparklines or simple bar chart)
- Click to view any past attempt's feedback

### 6.7 Sign-In (`/auth/signin`)
- Simple session-based auth (credentials provider with demo user for MVP)
- Or GitHub OAuth for quick setup

---

## Phase 7: Seed Data (5 LLD Problems)

| # | Problem | Difficulty |
|---|---------|-----------|
| 1 | Parking Lot System | Easy |
| 2 | Elevator System | Medium |
| 3 | Vending Machine | Easy |
| 4 | Library Management System | Medium |
| 5 | Ride-Sharing Service (simplified) | Hard |

Each problem includes:
- Title, description, functional requirements, constraints
- Problem-specific rubric with weighted dimensions

---

## Phase 8: Testing

### 8.1 Unit Tests (`__tests__/`)
- **Evaluator tests:** Mock AI responses, verify feedback structure, test fallback on failure
- **Submission tests:** Versioning, immutability, draft→final transitions
- **Domain logic:** Attempt state machine, duplicate evaluation guard, idempotency

### 8.2 Edge Case Tests
- Empty submission handling
- Evaluator failure (AI timeout/error) → graceful degradation
- Duplicate retry → no duplicate evaluations
- Invalid state transitions (e.g., evaluating a draft)

---

## Phase 9: Documentation

### 9.1 `README.md`
- Project overview, setup instructions (`npm install`, env vars, `npx prisma db push`, `npm run dev`)
- Key design decisions explained
- Known limitations
- Screenshots of the working prototype

### 9.2 `AI_USAGE.md`
Document 3–5 meaningful AI-assisted decisions:
1. **Submission format choice** (structured text over diagrams/code) — AI suggested, accepted with rationale
2. **Evaluation architecture** (composite evaluator with fallback) — AI suggested strategy pattern, refined
3. **Database schema design** (immutable submissions with versioning) — AI suggested, accepted
4. **Rubric dimension selection** — co-designed with AI, customized per problem
5. **Frontend component architecture** — AI suggested patterns, adapted to Next.js App Router

---

## Open Questions for You

> [!IMPORTANT]
> **Auth approach:** The plan uses a simple credentials provider with a hardcoded demo user (`demo@lldpractice.com` / `password`). For a 2-day prototype, this is the fastest approach. Should I use GitHub OAuth instead (slightly more polished but requires GitHub OAuth app setup)?

> [!IMPORTANT]
> **Database:** MongoDB Atlas (free tier) requires an internet connection and Atlas account setup. Alternatively, I can use **SQLite** with Prisma for zero-setup local development. Which do you prefer?

> [!IMPORTANT]
> **AI API:** The AI evaluator needs an OpenAI API key. Do you have one? If not, I'll implement a **mock AI evaluator** that returns realistic structured feedback without making API calls — the architecture will still demonstrate the Strategy pattern and swappability.

> [!WARNING]
> **Tailwind CSS:** The `create-next-app` scaffold includes Tailwind by default. The PRD doesn't specify a CSS approach. Using Tailwind will significantly speed up development for a 2-day assignment. Should I proceed with Tailwind, or use vanilla CSS?

---

## Execution Order

| Step | Task | Est. Time |
|------|------|-----------|
| 1 | Write `docs/RESEARCH.md` | 20 min |
| 2 | Write `docs/DESIGN.md` (with diagrams) | 40 min |
| 3 | Initialize Next.js + install deps | 10 min |
| 4 | Prisma schema + seed data | 30 min |
| 5 | Core domain logic (evaluators, types) | 45 min |
| 6 | API routes | 45 min |
| 7 | Frontend pages (6 pages) | 90 min |
| 8 | Tests | 30 min |
| 9 | README + AI_USAGE.md | 20 min |
| 10 | Polish + final review | 30 min |
| **Total** | | **~6 hours** |

---

## Verification Plan

### Automated Tests
```bash
npm test                  # Run all unit tests
npx prisma validate       # Validate schema
npm run build             # Ensure production build succeeds
```

### Manual Verification
- End-to-end flow: Sign in → Pick problem → Draft → Submit → See status transition → View feedback → View history
- Submit two different valid solutions to same problem → verify differentiated feedback
- Re-attempt a problem → verify history shows ≥2 attempts
- Substitute mock evaluator → verify no changes to Attempt/Submission logic
