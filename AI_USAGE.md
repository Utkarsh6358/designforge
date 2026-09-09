# AI Usage — LLD Practice Platform

## Introduction

AI (Claude, via Antigravity IDE) was used as a **collaborative design and implementation assistant** throughout the development of this project. I reviewed, adapted, tested, and validated generated suggestions against the assignment requirements and time budget.

AI was used across several phases:
- **Product & Domain Analysis:** Analyzing the PRD, breaking down requirements, identifying competitive gaps, and structuring trade-offs.
- **Architectural Design:** Formulating the Strategy pattern for swappable evaluation engines, designing problem-specific rubric schemas, and modeling database entities.
- **Implementation & Scaffolding:** Generating boilerplate for Next.js App Router routes, Prisma schemas, TypeScript interfaces, evaluator classes, and UI components.
- **Testing & Verification:** Writing unit test suites for evaluators and executing an end-to-end browser walkthrough of the complete practice loop.

Below are the key architectural decisions shaped through AI assistance.

---

## Decision 1: Tech Stack — Next.js Full-Stack with Prisma + SQLite

### AI Suggestion

AI presented multiple stack options ranging from minimal vanilla scripts to complex multi-repo architectures. It recommended a full-stack Next.js (App Router) approach with Prisma ORM and SQLite for local development, utilizing Next.js API routes as the backend to eliminate multi-service deployment overhead.

### Decision

**Accepted.** Adopted Next.js with TypeScript, Prisma, and SQLite.

### Reason

A full-stack Next.js project unifies frontend and backend in a single repository with zero boilerplate overhead, ideal for a 2-day engineering assignment. SQLite provides instant zero-setup local execution while Prisma preserves type safety and makes transitioning to PostgreSQL or MongoDB seamless for production.

---

## Decision 2: Evaluator Architecture — Strategy Pattern with Composite Evaluator

### AI Suggestion

AI proposed implementing the `Evaluator` interface using the **Strategy pattern** with three concrete implementations:
1. `RuleBasedEvaluator` — deterministic structural checks (required sections, class count, relationship density).
2. `MockAIEvaluator` / `RubricAIEvaluator` — judgment-based evaluation (SOLID analysis, responsibility clarity, trade-off reasoning).
3. `CompositeEvaluator` — an orchestrator that runs both engines, merges dimension scores, and implements graceful degradation if the AI call fails.

### Decision

**Accepted.** Implemented the composite Strategy pattern architecture.

### Reason

This satisfies the PRD's requirement to cleanly separate deterministic checks from judgment-based evaluation. The Strategy pattern ensures evaluators are genuinely swappable (e.g., adding `HumanEvaluator` or `StaticAnalysisEvaluator` in the future without changing attempt/submission logic). Graceful degradation ensures learners still receive deterministic feedback even during AI API outages.

---

## Decision 3: Submission Format — Structured Text/Pseudocode over Diagrams or Full Code

### AI Suggestion

AI analyzed the three submission formats outlined in the PRD (diagrams, full compilable code, structured text) and recommended **structured text with predefined sections** (Classes, Responsibilities, Relationships, Design Decisions). AI noted:
- Diagrams require specialized canvas UI tools and are prone to parsing errors.
- Full code requires sandboxed execution environments that evaluate syntax rather than architecture.
- Structured text directly captures design reasoning with high signal-to-noise ratio.

### Decision

**Accepted.** Implemented structured multi-section text input.

### Reason

Low-Level Design interviews evaluate design decisions, object relationships, and trade-off justification rather than language syntax. Structured text keeps the MVP lightweight, reliable to evaluate, and focused entirely on design thinking.

---

## Decision 4: Domain Model — Immutable Submissions with Explicit Evaluation Lifecycle

### AI Suggestion

AI proposed that:
- `Submission` records be **immutable and versioned** (creating new records on each save rather than mutating in place).
- `Evaluation` should possess an **explicit lifecycle** (`Pending → Running → Completed → Failed`) decoupled from the `Attempt` state.
- Even though MVP execution is synchronous within the API route, modeling the status lifecycle keeps the domain ready for background workers (BullMQ/Redis) without premature infrastructure complexity.

### Decision

**Accepted.** Adopted immutable versioned submissions and explicit evaluation state machine.

### Reason

Immutability preserves the audit trail, allowing learners to compare feedback across iterative attempts (v1 → v2 → v3). Decoupling evaluation status guarantees that evaluation failures never corrupt submitted work and prepares the system for asynchronous worker extraction as scale increases.

---

## Decision 5: Rubric Granularity — Problem-Specific Rubrics over Generic Rubrics

### AI Suggestion

AI evaluated generic vs. problem-specific rubrics and recommended **problem-specific rubrics** stored as JSON dimension arrays linked to each `Problem`. For instance, Parking Lot weights vehicle polymorphism and spot allocation, while Elevator weights state machine transitions and request scheduling.

### Decision

**Accepted.** Chose problem-specific rubrics.

### Reason

Generic rubrics produce boilerplate feedback. Problem-specific rubrics ensure that feedback is evidence-based and differentiated across different candidate solutions, directly fulfilling the PRD's core pedagogical goal.

---

## Verified End-to-End Demo Flow

During development, we verified the complete core practice loop end-to-end in the running application:

$$\text{Problem} \longrightarrow \text{Attempt} \longrightarrow \text{Submit} \longrightarrow \text{Feedback} \longrightarrow \text{Try Again} \longrightarrow \text{History}$$

### Step-by-Step Validation:
1. **Problem Selection:** Navigated problem catalog and viewed problem requirements, constraints, and specific rubric dimensions for *Parking Lot System*.
2. **Attempt Initialization:** Started an attempt for the demo user; draft saving persisted the versioned submission.
3. **Submission:** Submitted structured design (Classes, Responsibilities, Relationships, Design Decisions).
4. **Evaluation & Feedback:** The Composite Evaluator executed rule-based + AI evaluation, returning per-dimension scores (94.6% overall), evidence citations, concerns, and actionable suggestions.
5. **Try Again (Iteration):** Retried with a modified design to test multi-version progression and score differentiation.
6. **History:** Verified attempt history grouped by problem with score trends and complete historical feedback logs.
