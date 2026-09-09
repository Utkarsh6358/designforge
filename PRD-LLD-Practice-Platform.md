# Product Requirements Document
## LLD Practice Platform

**Version:** 1.0
**Author:** [Candidate Name]
**Date:** [Date]
**Status:** Draft — for 2-Day Engineering Assignment (CipherSchools)

---

## 1. Overview

LLD (Low-Level Design) is easy to start practicing and hard to self-evaluate. A learner can design a Parking Lot, Elevator, or Vending Machine system and still not know whether their classes, responsibilities, abstractions, and trade-offs are actually good.

The **LLD Practice Platform** is a focused practice tool that lets a learner repeatedly work through LLD problems and receive explainable, evidence-based feedback on their design — so each attempt is a step of improvement rather than a one-off exercise.

This PRD defines a narrow, buildable MVP for a 2-day prototype. It intentionally excludes LMS features, large-scale assessment infrastructure, and HLD/distributed-systems concerns.

---

## 2. Problem Statement

- LLD problems (e.g., Parking Lot, Elevator, Vending Machine) have **many valid solutions**, so there's no single "correct answer" to check against.
- Learners lack a fast, structured feedback loop — they don't know if their class boundaries, encapsulation, and extensibility choices are sound.
- Most existing resources (LeetCode-style judges, static tutorials, GitHub repos) are either purely informational or only support compiled/code-correctness checking — not design-quality evaluation.
- Without a history of past attempts, learners can't see whether they're actually improving or repeating the same design mistakes.

---

## 3. Goals & Non-Goals

### Goals (In Scope)
- Let a learner pick from a small curated set of LLD problems with clear requirements.
- Let a learner attempt a problem in a lightweight submission format (text/code, chosen deliberately — see §7).
- Evaluate the submission against a fixed rubric, combining deterministic checks with AI-assisted judgment.
- Return feedback that is specific and evidence-linked, not a bare score.
- Persist attempt history so a learner can track improvement over time.
- Model the core domain (Problem, Attempt, Submission, Evaluation, Feedback) with clean, extensible LLD.

### Non-Goals (Out of Scope for MVP)
- Full LMS features (courses, cohorts, instructor dashboards, payments).
- Multi-region deployment, sharding, CDN design, Kubernetes/microservices.
- Supporting every submission format (diagram + code + text) simultaneously.
- A "perfect" AI evaluator — the goal is a sound, extensible evaluation *architecture*, not SOTA grading accuracy.

---

## 4. Target User & Core Journey

**Primary user:** A learner (interview prep / engineering upskilling) practicing LLD independently.

**Core practice loop:**

```
Choose problem → Design/Think → Submit → Get feedback → Review → Try again
```

---

## 5. Functional Requirements (MVP Scope)

| Area | Requirement | Priority |
|---|---|---|
| Problem catalog | 3–5 LLD problems, each with a title, description, functional requirements, and constraints | Must |
| Attempt | Learner starts an attempt tied to a problem and a session/user | Must |
| Submission | Learner submits a design in a single chosen format (see §7); submission is timestamped and versioned | Must |
| Submission status | Learner sees status: `Submitted → Evaluating → Completed / Failed` | Must |
| Feedback | Rubric-based, per-dimension feedback with evidence pointers (not a single opaque score) | Must |
| History | Learner can view all past attempts per problem and see feedback trends | Must |
| Retry | Learner can start a new attempt on a previously attempted problem | Should |
| Resilience | A failed/slow evaluation does not lose the submission; retries don't create duplicate evaluations | Must |
| Extensibility hook | Domain model supports adding a new submission format or a new evaluator without rewriting the practice flow | Must |

---

## 6. Domain Model (Core LLD)

These are the anchor entities — not a prescriptive final model:

| Class | Responsibility |
|---|---|
| `Problem` | Owns problem metadata: title, requirements, constraints. |
| `Attempt` | Represents one learner's session against a `Problem`; owns lifecycle state. |
| `Submission` | Immutable record of what the learner submitted for an `Attempt` (versioned — supports resubmission). |
| `Evaluator` (interface) | Abstraction over "how a submission gets scored." Concrete implementations: `RubricBasedAIEvaluator`, future `RuleBasedEvaluator`, future `HumanEvaluator`. |
| `Evaluation` | The result of running an `Evaluator` against a `Submission`; owns status (`Pending/Completed/Failed`) and links to `Feedback`. |
| `Rubric` | Defines the fixed set of dimensions evaluated (e.g., responsibility clarity, coupling/cohesion, encapsulation, extensibility, edge-case handling). |
| `Feedback` | Structured output: `criterion → score → evidence → concern → suggestion`. |

**Key design decisions to defend in the design note:**
- `Evaluator` as an interface (Strategy pattern) — so a deterministic rule-based check and an AI-based check can be swapped or combined without touching `Attempt`/`Submission` flow.
- `Submission` is versioned and immutable — new attempts don't mutate history, which is what makes "attempt history" meaningful.
- `Evaluation` has its own lifecycle state independent of `Attempt`, so slow/failed AI calls don't block or corrupt the submission record.

---

## 7. Submission Format Decision

LLD can be expressed as text, code, diagram, or a combination. The MVP should pick **the smallest format that still gives enough evidence of design quality** — recommendation: **structured text/pseudocode design write-up** (class list + responsibilities + key interactions), optionally with lightweight code.

*Rationale to include in the design note:* diagrams require a diagramming UI (high build cost, low parsing reliability for AI evaluation); full code requires compiling/running arbitrary user code (adds infra complexity outside LLD scope). Structured text is fast to build, easy to parse, and still exposes responsibility/abstraction reasoning — the actual thing being evaluated.

---

## 8. Evaluation Approach

Split evaluation into deterministic vs. judgment-based, per the assignment's guidance:

| Deterministic (rule-based) | AI-assisted (judgment-based) |
|---|---|
| Required fields present / structural completeness | Quality of class responsibilities |
| Submission state transitions valid | Design trade-off reasoning |
| Duplicate-submission / idempotency handling | SOLID principle / abstraction analysis |
| — | Improvement suggestions, explanation quality |

**AI evaluation design:** fixed rubric + structured output schema (`criterion → score → evidence → concern → suggestion → confidence`), not an unconstrained prompt like "is this a good design?" This keeps feedback consistent and evidence-linked across runs.

---

## 9. Reliability / Practical "Scale" Considerations

Kept intentionally lightweight per the assignment's scope boundary:

- Submission is persisted **before** evaluation starts, so an evaluator failure never loses learner work.
- Evaluation runs asynchronously (or simulated async) with explicit states: `Submitted → Evaluating → Completed / Failed`, so a slow AI call doesn't block the request.
- Duplicate evaluation requests (e.g., user double-clicks retry) are guarded via idempotency on `Attempt`/`Submission` id.
- Future scale note (for design doc, not implementation): if load grows, the evaluation worker is the first component to separate out from the monolith, since it's the slowest and most externally-dependent piece.

---

## 10. Success Metrics (for the prototype demo)

- End-to-end flow works: pick problem → submit → see status transition → receive structured feedback → view in history.
- Feedback for two different valid solutions to the same problem is differentiated and evidence-based (not identical boilerplate).
- Re-attempting a problem is visibly supported (history shows ≥2 attempts).
- Codebase demonstrates the `Evaluator` abstraction is genuinely swappable (a stub/mock evaluator can be substituted with no changes to `Attempt`/`Submission` logic).

---

## 11. Deliverables Checklist (per assignment requirements)

- [ ] Research note (1–2 pages): learner problem, existing tools researched, gaps, product direction
- [ ] Design note: MVP, user flow, key classes/interfaces, evaluation approach, trade-offs
- [ ] Working prototype: end-to-end flow, problem selection → feedback → history
- [ ] Tests: core behavior + a few failure/edge cases (e.g., empty submission, evaluator failure, duplicate retry)
- [ ] README: setup/run instructions, key decisions, limitations
- [ ] AI_USAGE.md: 3–5 meaningful AI-assisted decisions (what was suggested, accepted/rejected, why)

---

## 12. Open Questions

- Should `Attempt` support multiple in-progress drafts before submission, or is submission always final-per-attempt?
- Should the rubric be problem-specific or fully generic across all problems in the catalog?
- Minimum viable auth: single hardcoded/demo user vs. lightweight session-based identity?

---

## 13. Evaluation Weighting Reference (from assignment brief)

| Area | Weight |
|---|---|
| Problem understanding & research | 15% |
| Product thinking / creativity | 15% |
| LLD / domain design | 25% |
| Evaluation & feedback approach | 15% |
| Extensibility & engineering judgement | 10% |
| Implementation quality | 10% |
| Testing & reliability | 5% |
| AI usage | 5% |
