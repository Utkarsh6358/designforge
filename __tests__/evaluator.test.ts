import { RuleBasedEvaluator } from "../src/lib/evaluator/rule-based-evaluator";
import { MockAIEvaluator } from "../src/lib/evaluator/mock-ai-evaluator";
import { CompositeEvaluator } from "../src/lib/evaluator/composite-evaluator";
import type {
  SubmissionContent,
  RubricDimension,
  Evaluator,
  EvaluationResult,
} from "../src/lib/evaluator/types";

// ============================================
// Test Data
// ============================================

const SAMPLE_RUBRIC: RubricDimension[] = [
  {
    name: "Responsibility Clarity",
    description: "Each class has a single responsibility",
    weight: 25,
    maxScore: 10,
  },
  {
    name: "Extensibility & OCP",
    description: "Design supports extension without modification",
    weight: 25,
    maxScore: 10,
  },
];

const GOOD_SUBMISSION: SubmissionContent = {
  classes:
    "ParkingLot: main system\nFloor: represents a floor\nParkingSpot: abstract base for spots\nCarSpot: extends ParkingSpot for cars\nBikeSpot: extends ParkingSpot for bikes\nVehicle: base class\nFeeCalculator: calculates fees using Strategy pattern",
  responsibilities:
    "ParkingLot manages floors and handles vehicle entry/exit. Floor tracks available spots. ParkingSpot knows its size and availability. FeeCalculator uses a PricingStrategy to compute fees based on vehicle type and duration.",
  relationships:
    "ParkingLot HAS-MANY Floor (composition). Floor HAS-MANY ParkingSpot (composition). ParkingSpot uses Vehicle (association). FeeCalculator implements PricingStrategy interface (strategy pattern). CarSpot and BikeSpot extend ParkingSpot (inheritance).",
  designDecisions:
    "Used Strategy pattern for FeeCalculator because pricing rules vary by vehicle type and could change independently. Made ParkingSpot abstract with type-specific subclasses for extensibility. Chose composition over inheritance for Floor→Spot relationship because floors and spots have different lifecycles. This ensures SOLID principles are maintained — each class has one reason to change.",
};

const EMPTY_SUBMISSION: SubmissionContent = {
  classes: "",
  responsibilities: "",
  relationships: "",
  designDecisions: "",
};

const SPARSE_SUBMISSION: SubmissionContent = {
  classes: "ParkingLot\nVehicle",
  responsibilities: "ParkingLot manages things",
  relationships: "",
  designDecisions: "",
};

// ============================================
// Test Runner (simple, no framework needed)
// ============================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n📋 ${name}`);
  try {
    await fn();
  } catch (e) {
    console.error(`  ❌ THREW: ${e}`);
    failed++;
  }
}

// ============================================
// Tests
// ============================================

async function runTests() {
  console.log("=== LLD Practice Platform — Unit Tests ===\n");

  // ---- RuleBasedEvaluator ----

  await test("RuleBasedEvaluator: scores a good submission highly", async () => {
    const evaluator = new RuleBasedEvaluator();
    const result = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);

    assert(result.status === "Completed", "Status is Completed");
    assert(result.evaluatorType === "rule-based", "Evaluator type is rule-based");
    assert(result.overallScore > 50, `Overall score > 50 (got ${result.overallScore})`);
    assert(result.feedback.length === 4, `Has 4 feedback items (got ${result.feedback.length})`);
  });

  await test("RuleBasedEvaluator: scores an empty submission low", async () => {
    const evaluator = new RuleBasedEvaluator();
    const result = await evaluator.evaluate(EMPTY_SUBMISSION, SAMPLE_RUBRIC);

    assert(result.overallScore === 0, `Overall score is 0 (got ${result.overallScore})`);
    assert(
      result.feedback.every((f) => f.score === 0),
      "All feedback scores are 0"
    );
  });

  await test("RuleBasedEvaluator: detects missing sections", async () => {
    const evaluator = new RuleBasedEvaluator();
    const result = await evaluator.evaluate(SPARSE_SUBMISSION, SAMPLE_RUBRIC);

    const completeness = result.feedback.find(
      (f) => f.criterion === "Structural Completeness"
    );
    assert(completeness !== undefined, "Has Structural Completeness feedback");
    assert(
      completeness!.score < completeness!.maxScore,
      `Completeness score < max (${completeness!.score}/${completeness!.maxScore})`
    );
    assert(
      completeness!.concern.includes("empty") || completeness!.concern.includes("brief") || completeness!.concern.includes("Missing") || completeness!.concern.includes("section"),
      "Concern mentions missing/empty sections"
    );
  });

  await test("RuleBasedEvaluator: feedback has all required fields", async () => {
    const evaluator = new RuleBasedEvaluator();
    const result = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);

    for (const fb of result.feedback) {
      assert(fb.criterion.length > 0, `criterion present: ${fb.criterion}`);
      assert(typeof fb.score === "number", `score is number for ${fb.criterion}`);
      assert(typeof fb.maxScore === "number", `maxScore is number for ${fb.criterion}`);
      assert(fb.evidence.length > 0, `evidence present for ${fb.criterion}`);
      assert(fb.concern.length > 0, `concern present for ${fb.criterion}`);
      assert(fb.suggestion.length > 0, `suggestion present for ${fb.criterion}`);
      assert(fb.confidence > 0, `confidence > 0 for ${fb.criterion}`);
    }
  });

  // ---- MockAIEvaluator ----

  await test("MockAIEvaluator: produces rubric-dimension feedback", async () => {
    const evaluator = new MockAIEvaluator();
    const result = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);

    assert(result.status === "Completed", "Status is Completed");
    assert(result.evaluatorType === "ai", "Evaluator type is ai");
    assert(
      result.feedback.length === SAMPLE_RUBRIC.length,
      `Feedback count matches rubric dimensions (${result.feedback.length} === ${SAMPLE_RUBRIC.length})`
    );

    for (const dim of SAMPLE_RUBRIC) {
      const fb = result.feedback.find((f) => f.criterion === dim.name);
      assert(fb !== undefined, `Has feedback for dimension: ${dim.name}`);
      assert(
        fb!.score <= dim.maxScore,
        `Score <= maxScore for ${dim.name} (${fb!.score} <= ${dim.maxScore})`
      );
    }
  });

  await test(
    "MockAIEvaluator: produces differentiated scores for different submissions",
    async () => {
      const evaluator = new MockAIEvaluator();
      const goodResult = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);
      const emptyResult = await evaluator.evaluate(EMPTY_SUBMISSION, SAMPLE_RUBRIC);

      assert(
        goodResult.overallScore > emptyResult.overallScore,
        `Good submission scores higher (${goodResult.overallScore} > ${emptyResult.overallScore})`
      );
    }
  );

  // ---- CompositeEvaluator ----

  await test(
    "CompositeEvaluator: merges rule-based + AI results",
    async () => {
      const evaluator = new CompositeEvaluator();
      const result = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);

      assert(result.evaluatorType === "composite", "Evaluator type is composite");
      assert(result.status === "Completed", "Status is Completed");
      // Rule-based produces 4, AI produces 2 (one per rubric dim)
      assert(
        result.feedback.length === 4 + SAMPLE_RUBRIC.length,
        `Merged feedback count (${result.feedback.length} === ${4 + SAMPLE_RUBRIC.length})`
      );
    }
  );

  await test(
    "CompositeEvaluator: gracefully degrades when AI fails",
    async () => {
      // Create a failing AI evaluator
      const failingEvaluator: Evaluator = {
        evaluate: async (): Promise<EvaluationResult> => {
          throw new Error("AI service unavailable");
        },
      };

      const evaluator = new CompositeEvaluator(failingEvaluator);
      const result = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);

      assert(result.status === "Partial", `Status is Partial (got ${result.status})`);
      assert(result.feedback.length > 0, "Still has rule-based feedback");
      assert(
        result.evaluatorType === "composite",
        "Evaluator type is still composite"
      );
    }
  );

  await test("CompositeEvaluator: swapping evaluator works", async () => {
    // Stub evaluator that always returns a fixed score
    const stubEvaluator: Evaluator = {
      evaluate: async (
        _sub: SubmissionContent,
        dims: RubricDimension[]
      ): Promise<EvaluationResult> => ({
        overallScore: 99,
        evaluatorType: "stub",
        status: "Completed",
        feedback: dims.map((d) => ({
          criterion: d.name,
          score: 9.9,
          maxScore: d.maxScore,
          evidence: "Stub evidence",
          concern: "None",
          suggestion: "None",
          confidence: 1.0,
        })),
      }),
    };

    const evaluator = new CompositeEvaluator(stubEvaluator);
    const result = await evaluator.evaluate(GOOD_SUBMISSION, SAMPLE_RUBRIC);

    assert(result.status === "Completed", "Completed with stub evaluator");
    const stubFeedback = result.feedback.filter(
      (f) => f.evidence === "Stub evidence"
    );
    assert(
      stubFeedback.length === SAMPLE_RUBRIC.length,
      `Stub feedback present (${stubFeedback.length} items)`
    );
  });

  // ---- Edge cases ----

  await test("Edge case: empty submission doesn't crash evaluators", async () => {
    const evaluator = new CompositeEvaluator();
    const result = await evaluator.evaluate(EMPTY_SUBMISSION, SAMPLE_RUBRIC);

    assert(result.status === "Completed", "Doesn't crash on empty submission");
    assert(typeof result.overallScore === "number", "Returns numeric score");
  });

  await test("Edge case: empty rubric dimensions", async () => {
    const evaluator = new CompositeEvaluator();
    const result = await evaluator.evaluate(GOOD_SUBMISSION, []);

    assert(result.status === "Completed", "Handles empty rubric");
    // Only rule-based feedback (4 items), no AI feedback (0 dimensions)
    assert(result.feedback.length === 4, `Only rule-based feedback (${result.feedback.length})`);
  });

  // ---- Summary ----
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
