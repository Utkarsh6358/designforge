# Research Note: LLD Practice Platform

**Author:** [Candidate Name]  
**Date:** [Date]  

---

## 1. The Learner Problem

Low-Level Design (LLD) — the practice of decomposing requirements into classes, responsibilities, interfaces, and interactions — is a core engineering competency tested in technical interviews and required for day-to-day software engineering. Unlike algorithmic problems, where correctness is binary (tests pass or fail), LLD problems have **many valid solutions**. A Parking Lot system can be reasonably designed in dozens of different ways, and determining whether one design is *better* than another requires nuanced judgment about coupling, cohesion, extensibility, and abstraction quality.

This creates a fundamental learning gap:

- **No single correct answer** — a learner cannot simply "check" their solution against a key.
- **No structured feedback loop** — after designing a system, a learner has no way to know whether their class boundaries, responsibility assignments, or pattern choices are sound.
- **No improvement tracking** — without persistent history, learners cannot see whether they are making the same design mistakes across attempts or actually improving.

The result is that LLD practice is easy to *start* and very hard to *self-evaluate*. Learners design systems in isolation and move on without knowing if they learned anything.

---

## 2. Existing Tools Researched

We surveyed the current landscape of LLD practice tools to understand what exists and where gaps remain.

### 2.1 LLDcoding (code.lldcoding.com)

An interactive, interview-focused platform with a built-in IDE for solving machine coding problems. Offers structured tracks in Java and C++ with test cases.

**Gap:** Evaluates **code correctness** (does the code compile, do tests pass), not **design quality** (are the classes well-structured, are responsibilities cleanly separated, is the design extensible). A solution that passes all tests can still have poor LLD.

### 2.2 Hello Interview (hellointerview.com)

A modern, practical guide to LLD and system design interviews. Focuses on pragmatic strategies over academic theory, with content authored by FAANG engineers.

**Gap:** Purely **educational content** — articles and guides. No interactive practice, no submission mechanism, no feedback loop.

### 2.3 AlgoMaster (algomaster.io)

A comprehensive platform combining OOP lessons, design pattern tutorials, and UML diagram references with interactive practice.

**Gap:** Practice exercises are primarily **MCQ and short-answer** format, not open-ended design submission. Does not evaluate a learner's actual class/interface design work.

### 2.4 LLDCanvas (lldcanvas.in)

An all-in-one free platform integrating a UML diagramming tool with an LLD curriculum. Includes a library of common problems (Parking Lot, Rate Limiter, etc.) with space to design and code.

**Gap:** Provides a **canvas for design** but no **automated feedback** on design quality. The learner designs but receives no evaluation of whether their design is good.

### 2.5 Awesome Low-Level Design (GitHub)

A widely-cited community repository acting as a master index for LLD interview preparation — covering OOP fundamentals, design patterns, common problems, and reference solutions.

**Gap:** A **static resource index**, not an interactive platform. Reference solutions are provided, but there is no way to submit a design and receive feedback.

### 2.6 CodeZym / CodeChef LLD Modules

Platforms offering company-tagged LLD problems and interactive modules with MCQs, short answers, and coding projects.

**Gap:** Focus on **knowledge testing** (do you know SOLID principles?) rather than **design evaluation** (did you apply SOLID principles well in this specific design?).

---

## 3. Gap Analysis

| Capability | LLDcoding | Hello Interview | AlgoMaster | LLDCanvas | GitHub Repos |
|---|:---:|:---:|:---:|:---:|:---:|
| Curated LLD problems | ✅ | ✅ | ✅ | ✅ | ✅ |
| Interactive practice | ✅ | ❌ | Partial | ✅ | ❌ |
| Design submission | ✅ (code) | ❌ | ❌ | ✅ (diagram) | ❌ |
| **Design quality feedback** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Rubric-based evaluation** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Attempt history / trends** | ❌ | ❌ | ❌ | ❌ | ❌ |

**The critical gap:** No existing tool provides structured, evidence-based feedback on *design quality* — the thing that actually determines whether a learner's LLD is good. Every tool either evaluates code correctness, provides static content, or offers a canvas without evaluation.

---

## 4. Product Direction

The **LLD Practice Platform** fills this gap by building the missing feedback loop:

```
Choose problem → Submit design → Receive rubric-based feedback → Track improvement → Retry
```

**Key differentiators:**
1. **Evaluation of design quality, not code correctness** — the rubric scores responsibility clarity, coupling/cohesion, encapsulation, extensibility, and edge-case handling.
2. **Structured, evidence-linked feedback** — not a single score, but per-dimension feedback with evidence pointers, concerns, and improvement suggestions.
3. **Persistent attempt history** — learners can see their progression across multiple attempts on the same problem.
4. **Extensible evaluation architecture** — the evaluator is a pluggable interface (Strategy pattern), so rule-based, AI-powered, and future human evaluators can be combined or swapped without changing the practice flow.

The MVP is deliberately narrow: 3 curated problems, structured text submissions, a composite evaluator (deterministic + AI-assisted), and a clean functional interface. This is a focused practice tool, not an LMS.
