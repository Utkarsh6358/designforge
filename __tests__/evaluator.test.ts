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
// Test Data — Original (Parking Lot)
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
// Test Data — Vending Machine
// ============================================

const VM_RUBRIC: RubricDimension[] = [
  {
    name: "State Machine Design",
    description:
      "Vending machine states (Idle, HasMoney, Dispensing, etc.) are explicitly modeled. Transitions are clear and valid.",
    weight: 25,
    maxScore: 10,
  },
  {
    name: "Responsibility Clarity",
    description:
      "Separation between VendingMachine, Inventory, PaymentProcessor, ChangeCalculator, and Product.",
    weight: 25,
    maxScore: 10,
  },
  {
    name: "Encapsulation & Information Hiding",
    description:
      "Internal cash register, inventory state, and change calculation logic are properly encapsulated.",
    weight: 20,
    maxScore: 10,
  },
  {
    name: "Extensibility & OCP",
    description:
      "Design supports adding new payment methods or product types without modifying the core machine logic.",
    weight: 15,
    maxScore: 10,
  },
  {
    name: "Edge Case Awareness",
    description:
      "Handles insufficient payment, exact change, out-of-stock, and cannot-make-change scenarios.",
    weight: 15,
    maxScore: 10,
  },
];

const STRONG_VM_SUBMISSION: SubmissionContent = {
  classes:
    "VendingMachine: coordinator/orchestrator\nVendingState: interface for state pattern\nIdleState: implements VendingState\nProductSelectedState: implements VendingState\nHasMoneyState (PaymentReceivedState): implements VendingState\nDispensingState: implements VendingState\nInventory: tracks product stock\nPaymentProcessor: handles payment validation\nChangeCalculator: computes change using available denominations\nProduct: represents a vendable item\nVendingSession: tracks current transaction",
  responsibilities:
    "VendingMachine acts as coordinator and delegates to other classes. Inventory owns stock changes and manages product quantities. PaymentProcessor owns payment handling and validates inserted money. ChangeCalculator owns change calculation and determines optimal denomination breakdown. Product holds price, name, and code. VendingSession tracks current customer interaction. Each class has a single responsibility with clear separation.",
  relationships:
    "VendingMachine HAS-A current VendingState (State pattern). VendingMachine delegates to Inventory, PaymentProcessor, and ChangeCalculator. State classes implement VendingState interface. State transitions are controlled through methods on the VendingState interface. Product is used by Inventory (composition). VendingSession aggregates Product and payment info.",
  designDecisions:
    "Used State pattern for explicit state classes (IdleState, ProductSelectedState, HasMoneyState, DispensingState) because the vending machine behavior varies significantly by state and invalid operations should be rejected based on current state. Used Strategy pattern for interchangeable payment methods so new payment types can be added without modifying VendingMachine. Made internal state private — callers cannot directly manipulate Inventory or PaymentProcessor internals. Edge cases handled: insufficient payment returns money, exact payment skips change, out-of-stock rejects selection, cannot make change triggers refund, cancellation returns all inserted money, invalid product code shows error, duplicate dispensing prevented by state transition, inventory decrement happens exactly once during dispensing.",
};

const WEAK_VM_SUBMISSION: SubmissionContent = {
  classes: "VendingMachine: handles everything",
  responsibilities:
    "VendingMachine handles inventory, payment, change, and dispensing. It manages all product selection and tracks all money. It does everything in one big class.",
  relationships: "VendingMachine uses products directly.",
  designDecisions:
    "Used one class to keep it simple. The VendingMachine checks a status variable with if/else to determine what to do. No explicit state model. No separation of concerns.",
};

// ============================================
// Test Data — Parking Lot (Strong vs Weak)
// ============================================

const PL_RUBRIC: RubricDimension[] = [
  {
    name: "Responsibility Clarity",
    description:
      "Each class has a single, well-defined responsibility. ParkingLot, Floor, Spot, Vehicle, and FeeCalculator are distinct.",
    weight: 25,
    maxScore: 10,
  },
  {
    name: "Vehicle Type Polymorphism",
    description:
      "Vehicle types handled via polymorphism/strategy, not if-else chains. New vehicle types can be added without modifying existing code.",
    weight: 20,
    maxScore: 10,
  },
  {
    name: "Encapsulation & Information Hiding",
    description:
      "Internal state (spots, floors) is hidden behind well-defined interfaces. Spot allocation logic is encapsulated.",
    weight: 20,
    maxScore: 10,
  },
  {
    name: "Extensibility & OCP",
    description:
      "Design supports adding new vehicle types, fee strategies, or floor types without modifying existing classes.",
    weight: 20,
    maxScore: 10,
  },
  {
    name: "Edge Case Awareness",
    description:
      "Handles full lot, invalid vehicle type, double-exit, and concurrent entry/exit scenarios.",
    weight: 15,
    maxScore: 10,
  },
];

const STRONG_PL_SUBMISSION: SubmissionContent = {
  classes:
    "ParkingLot: coordinator, manages entry/exit\nFloor: represents a floor, tracks spots\nParkingSpot: abstract base class for spots, encapsulates occupancy\nCarSpot: extends ParkingSpot for car-sized vehicles\nBikeSpot: extends ParkingSpot for motorcycles\nTruckSpot: extends ParkingSpot for trucks\nVehicle: abstract base class\nCar: extends Vehicle\nMotorcycle: extends Vehicle\nTruck: extends Vehicle\nFeeCalculator: uses PricingStrategy interface\nPricingStrategy: interface for fee calculation strategy",
  responsibilities:
    "ParkingLot acts as coordinator and delegates to Floor for spot management. Floor tracks available spots per type. ParkingSpot encapsulates occupancy and availability. Each Vehicle subclass knows its size. FeeCalculator uses a PricingStrategy to compute fees. Each class has a single responsibility with clear separation.",
  relationships:
    "ParkingLot HAS-MANY Floor (composition). Floor HAS-MANY ParkingSpot (composition). Car, Motorcycle, Truck extend Vehicle (inheritance). CarSpot, BikeSpot, TruckSpot extend ParkingSpot (inheritance). FeeCalculator uses PricingStrategy interface (Strategy pattern). Spot allocation uses a strategy pattern.",
  designDecisions:
    "Used abstract Vehicle with Car/Motorcycle/Truck subclasses for polymorphism — no if/else chains on vehicle type. ParkingSpot is abstract with type-specific subclasses for extensibility. Strategy pattern for pricing so new fee strategies can be added without modifying FeeCalculator. Internal spot state is private — callers cannot directly modify ParkingSpot occupancy. Edge cases: full lot rejects entry, invalid vehicle type returns error, double exit prevented by checking spot state, concurrent entry/exit handled with synchronization, cancellation and refund supported.",
};

const WEAK_PL_SUBMISSION: SubmissionContent = {
  classes: "ParkingLot: manages everything\nVehicle: has a vehicleType string",
  responsibilities:
    "ParkingLot handles everything — spot allocation, pricing, vehicle tracking, fee calculation. No separation.",
  relationships: "ParkingLot directly manages Vehicle objects.",
  designDecisions:
    "Used one big class. Vehicle type is a string with if/else to check type. Pricing is hard-coded in ParkingLot. No interfaces. Exposed spot state for external access.",
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

  // ============================================
  // NEW TESTS — MockAIEvaluator Signal-Based Evaluation
  // ============================================

  // ---- Test A: Strong Vending Machine scores high ----

  await test(
    "MockAIEvaluator: strong Vending Machine submission scores high across all dimensions",
    async () => {
      const evaluator = new MockAIEvaluator();
      const result = await evaluator.evaluate(STRONG_VM_SUBMISSION, VM_RUBRIC);

      assert(result.status === "Completed", "Status is Completed");
      assert(
        result.feedback.length === VM_RUBRIC.length,
        `Has ${VM_RUBRIC.length} feedback items (got ${result.feedback.length})`
      );

      console.log(`\n  📊 Strong VM Scores:`);
      for (const dim of VM_RUBRIC) {
        const fb = result.feedback.find((f) => f.criterion === dim.name)!;
        console.log(`     ${dim.name}: ${fb.score}/${fb.maxScore}`);
        assert(
          fb.score >= 7,
          `${dim.name} score >= 7 (got ${fb.score})`
        );
      }

      console.log(`     Overall: ${result.overallScore}%`);
      assert(
        result.overallScore >= 70,
        `Overall score >= 70 (got ${result.overallScore})`
      );
    }
  );

  // ---- Test B: Weak VM scores significantly lower ----

  await test(
    "MockAIEvaluator: weak Vending Machine submission scores lower than strong on every dimension",
    async () => {
      const evaluator = new MockAIEvaluator();
      const strongResult = await evaluator.evaluate(STRONG_VM_SUBMISSION, VM_RUBRIC);
      const weakResult = await evaluator.evaluate(WEAK_VM_SUBMISSION, VM_RUBRIC);

      console.log(`\n  📊 Weak VM Scores:`);
      for (const dim of VM_RUBRIC) {
        const strongFb = strongResult.feedback.find((f) => f.criterion === dim.name)!;
        const weakFb = weakResult.feedback.find((f) => f.criterion === dim.name)!;
        console.log(`     ${dim.name}: strong=${strongFb.score} vs weak=${weakFb.score}`);
        assert(
          strongFb.score > weakFb.score,
          `Strong > Weak for ${dim.name} (${strongFb.score} > ${weakFb.score})`
        );
      }

      console.log(`     Overall: strong=${strongResult.overallScore} vs weak=${weakResult.overallScore}`);
      assert(
        strongResult.overallScore > weakResult.overallScore,
        `Strong overall > Weak overall (${strongResult.overallScore} > ${weakResult.overallScore})`
      );
    }
  );

  // ---- Test C: Determinism — same input → same output ----

  await test(
    "MockAIEvaluator: deterministic — same submission produces identical results",
    async () => {
      const evaluator = new MockAIEvaluator();
      const result1 = await evaluator.evaluate(STRONG_VM_SUBMISSION, VM_RUBRIC);
      const result2 = await evaluator.evaluate(STRONG_VM_SUBMISSION, VM_RUBRIC);

      assert(
        result1.overallScore === result2.overallScore,
        `Overall scores identical (${result1.overallScore} === ${result2.overallScore})`
      );

      for (let i = 0; i < VM_RUBRIC.length; i++) {
        const fb1 = result1.feedback[i];
        const fb2 = result2.feedback[i];

        assert(
          fb1.score === fb2.score,
          `Score identical for ${fb1.criterion} (${fb1.score} === ${fb2.score})`
        );
        assert(
          fb1.evidence === fb2.evidence,
          `Evidence identical for ${fb1.criterion}`
        );
        assert(
          fb1.concern === fb2.concern,
          `Concern identical for ${fb1.criterion}`
        );
        assert(
          fb1.suggestion === fb2.suggestion,
          `Suggestion identical for ${fb1.criterion}`
        );
        assert(
          fb1.confidence === fb2.confidence,
          `Confidence identical for ${fb1.criterion} (${fb1.confidence} === ${fb2.confidence})`
        );
      }
    }
  );

  // ---- Test D: Strong PL > Weak PL ----

  await test(
    "MockAIEvaluator: strong Parking Lot submission scores higher than weak",
    async () => {
      const evaluator = new MockAIEvaluator();
      const strongResult = await evaluator.evaluate(STRONG_PL_SUBMISSION, PL_RUBRIC);
      const weakResult = await evaluator.evaluate(WEAK_PL_SUBMISSION, PL_RUBRIC);

      console.log(`\n  📊 Parking Lot Scores:`);
      for (const dim of PL_RUBRIC) {
        const strongFb = strongResult.feedback.find((f) => f.criterion === dim.name)!;
        const weakFb = weakResult.feedback.find((f) => f.criterion === dim.name)!;
        console.log(`     ${dim.name}: strong=${strongFb.score} vs weak=${weakFb.score}`);
      }

      console.log(`     Overall: strong=${strongResult.overallScore} vs weak=${weakResult.overallScore}`);
      assert(
        strongResult.overallScore > weakResult.overallScore,
        `Strong PL overall > Weak PL overall (${strongResult.overallScore} > ${weakResult.overallScore})`
      );
    }
  );

  // ---- Test E: Empty/sparse submission produces useful feedback ----

  await test(
    "MockAIEvaluator: empty submission gets low scores with useful feedback",
    async () => {
      const evaluator = new MockAIEvaluator();
      const result = await evaluator.evaluate(EMPTY_SUBMISSION, VM_RUBRIC);

      console.log(`\n  📊 Empty Submission VM Scores:`);
      for (const dim of VM_RUBRIC) {
        const fb = result.feedback.find((f) => f.criterion === dim.name)!;
        console.log(`     ${dim.name}: ${fb.score}/${fb.maxScore}`);
        assert(
          fb.score <= dim.maxScore * 0.4,
          `${dim.name} score <= 40% of max (${fb.score} <= ${dim.maxScore * 0.4})`
        );
        assert(
          fb.evidence.toLowerCase().includes("no") || fb.evidence.toLowerCase().includes("missing") || fb.evidence.toLowerCase().includes("not"),
          `Evidence mentions missing content for ${dim.name}`
        );
        assert(
          fb.confidence <= 0.7,
          `Confidence <= 0.7 for ${dim.name} (got ${fb.confidence})`
        );
      }

      console.log(`     Overall: ${result.overallScore}%`);
      assert(
        result.overallScore <= 40,
        `Overall score <= 40 (got ${result.overallScore})`
      );
    }
  );

  // ---- Test F: MockAIEvaluator feedback references actual content ----

  await test(
    "MockAIEvaluator: evidence references actual submission content, not generic templates",
    async () => {
      const evaluator = new MockAIEvaluator();
      const result = await evaluator.evaluate(STRONG_VM_SUBMISSION, VM_RUBRIC);

      const stateFb = result.feedback.find(
        (f) => f.criterion === "State Machine Design"
      )!;
      // Should mention actual signals found in submission
      assert(
        stateFb.evidence.includes("IdleState") ||
          stateFb.evidence.toLowerCase().includes("state pattern") ||
          stateFb.evidence.toLowerCase().includes("state transition"),
        `State Machine evidence references actual submission concepts (got: ${stateFb.evidence.substring(0, 100)}...)`
      );

      const respFb = result.feedback.find(
        (f) => f.criterion === "Responsibility Clarity"
      )!;
      assert(
        respFb.evidence.includes("Inventory") ||
          respFb.evidence.includes("PaymentProcessor") ||
          respFb.evidence.toLowerCase().includes("delegation"),
        `Responsibility evidence references actual submission concepts (got: ${respFb.evidence.substring(0, 100)}...)`
      );
    }
  );

  // ---- Test G: Confidence is deterministic ----

  await test(
    "MockAIEvaluator: confidence values are deterministic (no randomness)",
    async () => {
      const evaluator = new MockAIEvaluator();
      const results: EvaluationResult[] = [];

      // Run 3 times
      for (let i = 0; i < 3; i++) {
        results.push(await evaluator.evaluate(STRONG_VM_SUBMISSION, VM_RUBRIC));
      }

      for (let dimIdx = 0; dimIdx < VM_RUBRIC.length; dimIdx++) {
        const confidences = results.map((r) => r.feedback[dimIdx].confidence);
        const allSame = confidences.every((c) => c === confidences[0]);
        assert(
          allSame,
          `Confidence deterministic for ${VM_RUBRIC[dimIdx].name} (values: ${confidences.join(", ")})`
        );
        assert(
          [0.6, 0.7, 0.8, 0.9].includes(confidences[0]),
          `Confidence is one of [0.6, 0.7, 0.8, 0.9] for ${VM_RUBRIC[dimIdx].name} (got ${confidences[0]})`
        );
      }
    }
  );

  // ---- Summary ----
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
