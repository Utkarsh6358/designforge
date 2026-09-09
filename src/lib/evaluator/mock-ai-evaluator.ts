import {
  Evaluator,
  EvaluationResult,
  FeedbackItem,
  SubmissionContent,
  RubricDimension,
} from "./types";

// ============================================
// Signal Types
// ============================================

interface Signal {
  pattern: RegExp;
  label: string;
}

interface DimensionConfig {
  positiveSignals: Signal[];
  negativeSignals: Signal[];
  missingEvidenceNote: string;
  baseSuggestion: string;
}

interface SignalScanResult {
  matchedPositive: string[];
  matchedNegative: string[];
}

// ============================================
// Scoring Constants
// ============================================

const BASELINE_FRACTION = 0.3;     // start at 30% of maxScore
const BONUS_PER_SIGNAL = 0.9;     // points per positive signal
const PENALTY_PER_SIGNAL = 0.7;   // points subtracted per negative signal
const MAX_BONUS_FRACTION = 0.7;   // bonus can add up to 70% of maxScore

// Confidence thresholds
const CONFIDENCE_HIGH = 0.90;     // ≥ 5 total signal hits
const CONFIDENCE_MODERATE = 0.80; // 3-4 hits
const CONFIDENCE_LOW = 0.70;      // 1-2 hits
const CONFIDENCE_NONE = 0.60;     // 0 hits

// ============================================
// MockAIEvaluator
// ============================================

/**
 * MockAIEvaluator — deterministic, rubric-aware evaluator.
 *
 * Analyzes actual submission content by scanning for design signals
 * (positive and negative patterns) relevant to each rubric dimension.
 * Produces evidence-based feedback referencing concepts found in
 * the submission. No external API calls, no randomness.
 *
 * Supports: Vending Machine, Parking Lot, and Elevator System rubrics.
 * Unrecognized dimensions receive a generic OOP-signal evaluation.
 */
export class MockAIEvaluator implements Evaluator {
  async evaluate(
    submission: SubmissionContent,
    rubricDimensions: RubricDimension[]
  ): Promise<EvaluationResult> {
    const allText = this.concatenateSubmission(submission);

    const feedback: FeedbackItem[] = rubricDimensions.map((dim) =>
      this.evaluateDimension(dim, submission, allText)
    );

    const totalScore = feedback.reduce((sum, f) => sum + f.score, 0);
    const totalMax = feedback.reduce((sum, f) => sum + f.maxScore, 0);
    const overallScore = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      feedback,
      evaluatorType: "ai",
      status: "Completed",
    };
  }

  // ============================================
  // Core Evaluation Pipeline
  // ============================================

  private evaluateDimension(
    dim: RubricDimension,
    submission: SubmissionContent,
    allText: string
  ): FeedbackItem {
    const config = this.getDimensionConfig(dim.name);
    const scanResult = this.scanSignals(allText, config);
    const score = this.calculateScore(
      scanResult.matchedPositive.length,
      scanResult.matchedNegative.length,
      dim.maxScore
    );
    const evidence = this.generateEvidence(dim.name, scanResult, config);
    const concern = this.generateConcern(dim.name, scanResult, config);
    const suggestion = this.generateSuggestion(dim.name, scanResult, config);
    const confidence = this.calculateConfidence(scanResult);

    return {
      criterion: dim.name,
      score,
      maxScore: dim.maxScore,
      evidence,
      concern,
      suggestion,
      confidence,
    };
  }

  // ============================================
  // Signal Scanning
  // ============================================

  private scanSignals(text: string, config: DimensionConfig): SignalScanResult {
    const matchedPositive: string[] = [];
    const matchedNegative: string[] = [];

    for (const signal of config.positiveSignals) {
      if (signal.pattern.test(text)) {
        matchedPositive.push(signal.label);
      }
    }

    for (const signal of config.negativeSignals) {
      if (signal.pattern.test(text)) {
        matchedNegative.push(signal.label);
      }
    }

    return { matchedPositive, matchedNegative };
  }

  // ============================================
  // Score Calculation
  // ============================================

  private calculateScore(
    positiveCount: number,
    negativeCount: number,
    maxScore: number
  ): number {
    const baseline = maxScore * BASELINE_FRACTION;
    const maxBonus = maxScore * MAX_BONUS_FRACTION;
    const bonus = Math.min(positiveCount * BONUS_PER_SIGNAL, maxBonus);
    const penalty = negativeCount * PENALTY_PER_SIGNAL;
    const raw = baseline + bonus - penalty;
    const clamped = Math.max(0, Math.min(raw, maxScore));
    return Math.round(clamped * 10) / 10;
  }

  // ============================================
  // Evidence Generation
  // ============================================

  private generateEvidence(
    dimensionName: string,
    scanResult: SignalScanResult,
    config: DimensionConfig
  ): string {
    const parts: string[] = [];

    if (scanResult.matchedPositive.length > 0) {
      parts.push(
        `Evidence: Submission demonstrates ${dimensionName.toLowerCase()} through: ${scanResult.matchedPositive.join(", ")}.`
      );
    }

    if (scanResult.matchedNegative.length > 0) {
      parts.push(
        `Evidence: Submission shows potential issues: ${scanResult.matchedNegative.join(", ")}.`
      );
    }

    if (
      scanResult.matchedPositive.length === 0 &&
      scanResult.matchedNegative.length === 0
    ) {
      parts.push(`Evidence: ${config.missingEvidenceNote}`);
    }

    return parts.join(" ");
  }

  // ============================================
  // Concern Generation
  // ============================================

  private generateConcern(
    dimensionName: string,
    scanResult: SignalScanResult,
    config: DimensionConfig
  ): string {
    if (
      scanResult.matchedNegative.length === 0 &&
      scanResult.matchedPositive.length >= 3
    ) {
      return `No major concerns for ${dimensionName}. The design addresses this dimension well.`;
    }

    if (
      scanResult.matchedPositive.length === 0 &&
      scanResult.matchedNegative.length === 0
    ) {
      return `Concern: No evidence found for ${dimensionName}. The submission does not appear to address this dimension.`;
    }

    const concerns: string[] = [];

    if (scanResult.matchedNegative.length > 0) {
      concerns.push(
        `Concern: The following issues were detected for ${dimensionName}: ${scanResult.matchedNegative.join("; ")}.`
      );
    }

    if (
      scanResult.matchedPositive.length > 0 &&
      scanResult.matchedPositive.length < 3 &&
      scanResult.matchedNegative.length === 0
    ) {
      concerns.push(
        `Concern: Only partial evidence for ${dimensionName} was found. Consider elaborating further.`
      );
    }

    return concerns.join(" ");
  }

  // ============================================
  // Suggestion Generation
  // ============================================

  private generateSuggestion(
    dimensionName: string,
    scanResult: SignalScanResult,
    config: DimensionConfig
  ): string {
    if (
      scanResult.matchedPositive.length >= 4 &&
      scanResult.matchedNegative.length === 0
    ) {
      return `Strong ${dimensionName.toLowerCase()} demonstrated. Consider documenting the rationale behind your design choices for this dimension.`;
    }

    if (
      scanResult.matchedPositive.length === 0 &&
      scanResult.matchedNegative.length === 0
    ) {
      return `Suggestion: ${config.baseSuggestion}`;
    }

    const suggestions: string[] = [];

    if (scanResult.matchedNegative.length > 0) {
      suggestions.push(`Suggestion: ${config.baseSuggestion}`);
    }

    if (
      scanResult.matchedPositive.length > 0 &&
      scanResult.matchedPositive.length < 4 &&
      scanResult.matchedNegative.length === 0
    ) {
      suggestions.push(
        `Suggestion: Good start on ${dimensionName.toLowerCase()}. ${config.baseSuggestion}`
      );
    }

    return suggestions.join(" ");
  }

  // ============================================
  // Confidence Calculation
  // ============================================

  private calculateConfidence(scanResult: SignalScanResult): number {
    const total =
      scanResult.matchedPositive.length + scanResult.matchedNegative.length;
    if (total >= 5) return CONFIDENCE_HIGH;
    if (total >= 3) return CONFIDENCE_MODERATE;
    if (total >= 1) return CONFIDENCE_LOW;
    return CONFIDENCE_NONE;
  }

  // ============================================
  // Utility
  // ============================================

  private concatenateSubmission(submission: SubmissionContent): string {
    return [
      submission.classes || "",
      submission.responsibilities || "",
      submission.relationships || "",
      submission.designDecisions || "",
    ]
      .join(" ")
      .toLowerCase();
  }

  // ============================================
  // Dimension Signal Configurations
  // ============================================

  private getDimensionConfig(dimensionName: string): DimensionConfig {
    const configs: Record<string, DimensionConfig> = {
      // =============================================
      // VENDING MACHINE DIMENSIONS
      // =============================================

      "State Machine Design": {
        positiveSignals: [
          { pattern: /\bvending\s*state\b/i, label: "VendingState abstraction" },
          { pattern: /\bidle\s*state\b/i, label: "IdleState class" },
          { pattern: /\bproduct\s*selected\s*state\b/i, label: "ProductSelectedState class" },
          { pattern: /\b(has\s*money|payment\s*received)\s*state\b/i, label: "HasMoney/PaymentReceivedState class" },
          { pattern: /\bdispensing\s*state\b/i, label: "DispensingState class" },
          { pattern: /\bstate\s*pattern\b/i, label: "explicit State pattern usage" },
          { pattern: /\bstate\s*(transition|machine)\b/i, label: "explicit state transitions" },
          { pattern: /\bexplicit\s*state\b/i, label: "explicit state modeling" },
          { pattern: /\binvalid\b.*\breject/i, label: "invalid operations rejected based on state" },
          { pattern: /\breject\b.*\binvalid/i, label: "rejection of invalid operations" },
          { pattern: /\bstate\s*class(es)?\b/i, label: "dedicated state classes" },
          { pattern: /\bcurrent\s*state\b/i, label: "current state tracking" },
        ],
        negativeSignals: [
          { pattern: /\bif\s*\/?\s*else\b.*\b(state|status)\b/i, label: "state managed via if/else chains instead of state objects" },
          { pattern: /\b(state|status)\b.*\bif\s*\/?\s*else\b/i, label: "state decisions using conditional branches" },
          { pattern: /\bswitch\b.*\b(state|status)\b/i, label: "switch-based state management" },
          { pattern: /\bone\s*(big|large|single)\s*(class|method)\b/i, label: "monolithic class handling all state logic" },
          { pattern: /\bno\s*(explicit\s*)?state\b/i, label: "no explicit state model" },
        ],
        missingEvidenceNote:
          "No explicit state abstraction or state transition model is described in the submission.",
        baseSuggestion:
          "Model vending machine states as explicit classes (IdleState, HasMoneyState, DispensingState) implementing a VendingState interface, with well-defined transitions between them.",
      },

      "Responsibility Clarity": {
        positiveSignals: [
          { pattern: /\binventory\b/i, label: "Inventory class" },
          { pattern: /\bpayment\s*processor\b/i, label: "PaymentProcessor class" },
          { pattern: /\bchange\s*calculator\b/i, label: "ChangeCalculator class" },
          { pattern: /\bproduct\b/i, label: "Product class" },
          { pattern: /\bvending\s*session\b/i, label: "VendingSession class" },
          { pattern: /\b(coordinator|orchestrat)\b/i, label: "VendingMachine as coordinator/orchestrator" },
          { pattern: /\bdelegate\b/i, label: "delegation of responsibilities" },
          { pattern: /\bsingle\s*responsibility\b/i, label: "SRP awareness" },
          { pattern: /\bseparation\b/i, label: "separation of concerns" },
          // Parking Lot specific responsibility signals
          { pattern: /\bparking\s*lot\b.*\b(coordinator|orchestrat|manage)\b/i, label: "ParkingLot as coordinator" },
          { pattern: /\bfloor\b/i, label: "Floor class" },
          { pattern: /\bparking\s*spot\b/i, label: "ParkingSpot class" },
          { pattern: /\bfee\s*(calculator|strategy)\b/i, label: "FeeCalculator/FeeStrategy class" },
          { pattern: /\bvehicle\b/i, label: "Vehicle class" },
          // Elevator specific responsibility signals
          { pattern: /\belevator\s*controller\b/i, label: "ElevatorController class" },
          { pattern: /\bbuilding\b/i, label: "Building class" },
          { pattern: /\belevator\b/i, label: "Elevator class" },
          { pattern: /\brequest\b.*\b(class|object|queue)\b/i, label: "Request class" },
          { pattern: /\bdoor\b/i, label: "Door class" },
          { pattern: /\bscheduling\s*strategy\b/i, label: "SchedulingStrategy class" },
        ],
        negativeSignals: [
          { pattern: /\bgod\s*class\b/i, label: "god-class behavior identified" },
          { pattern: /\bhandles?\s*(everything|all|inventory.*payment|payment.*inventory)\b/i, label: "single class handling multiple unrelated responsibilities" },
          { pattern: /\bvending\s*machine\b.*\b(handles?|manages?|processes?)\b.*\b(inventory|payment|change|dispensing)\b.*\b(inventory|payment|change|dispensing)\b/i, label: "VendingMachine handling multiple independent concerns directly" },
          { pattern: /\bparking\s*lot\b.*\b(handles?|manages?|does)\b.*\b(everything|all|pricing.*spot|spot.*pricing)\b/i, label: "ParkingLot handling multiple independent concerns directly" },
          { pattern: /\bno\s*separation\b/i, label: "no separation of concerns" },
        ],
        missingEvidenceNote:
          "No clear separation of responsibilities is described. The submission does not identify distinct classes with focused roles.",
        baseSuggestion:
          "Identify distinct responsibilities and extract them into separate classes. Each class should have one reason to change.",
      },

      "Encapsulation & Information Hiding": {
        positiveSignals: [
          { pattern: /\bprivate\b/i, label: "private fields/methods" },
          { pattern: /\binternal\s*state\b/i, label: "internal state hidden" },
          { pattern: /\bencapsulat/i, label: "encapsulation awareness" },
          { pattern: /\binformation\s*hiding\b/i, label: "information hiding principle" },
          { pattern: /\binterface\b/i, label: "interface-based access" },
          { pattern: /\bgetter\b|\bsetter\b|\baccessor\b/i, label: "controlled access via getters/setters" },
          { pattern: /\binventory\b.*\b(owns?|manages?|controls?)\b.*\bstock\b/i, label: "Inventory owns stock changes" },
          { pattern: /\bpayment\b.*\b(owns?|handles?|controls?)\b.*\bpayment\b/i, label: "PaymentProcessor owns payment handling" },
          { pattern: /\bchange\b.*\b(owns?|handles?|calculat)\b/i, label: "ChangeCalculator owns change logic" },
          { pattern: /\bspot\b.*\b(encapsulat|owns?|manages?)\b.*\b(occupan|availab)\b/i, label: "ParkingSpot encapsulates occupancy" },
          { pattern: /\bcontrolled\b.*\b(through|via)\b.*\b(method|interface)\b/i, label: "state transitions controlled through methods/interfaces" },
          { pattern: /\bdefensive\s*cop/i, label: "defensive copies for collections" },
          { pattern: /\bimmutable\b/i, label: "immutable data" },
        ],
        negativeSignals: [
          { pattern: /\bexposed?\b.*\b(inventory|quantities|stock|state)\b/i, label: "exposed internal state (inventory/quantities)" },
          { pattern: /\bdirectly\s*(modif|manipulat|access|set)\b/i, label: "callers directly modifying internal state" },
          { pattern: /\bpublic\s*mutable\b/i, label: "public mutable state" },
          { pattern: /\bno\s*encapsulat/i, label: "no encapsulation" },
          { pattern: /\bexposed?\s*spot\b/i, label: "exposed spot state" },
        ],
        missingEvidenceNote:
          "No evidence of encapsulation or information hiding practices found in the submission.",
        baseSuggestion:
          "Make internal state private and expose only necessary operations through well-defined interfaces. Ensure callers cannot directly manipulate internal state of other objects.",
      },

      "Extensibility & OCP": {
        positiveSignals: [
          { pattern: /\binterface\b/i, label: "interface usage" },
          { pattern: /\bstrategy\s*pattern\b/i, label: "Strategy pattern" },
          { pattern: /\bstate\s*pattern\b/i, label: "State pattern" },
          { pattern: /\babstract\b/i, label: "abstract classes/methods" },
          { pattern: /\bpolymorphi/i, label: "polymorphism" },
          { pattern: /\bopen[\s-]*closed\b/i, label: "Open-Closed Principle awareness" },
          { pattern: /\binterchangeable\b/i, label: "interchangeable implementations" },
          { pattern: /\bswappable\b/i, label: "swappable strategies" },
          { pattern: /\bwithout\s*(modif|chang)\b/i, label: "extension without modification" },
          { pattern: /\bnew\s*(payment|product|vehicle|type|method)\b.*\b(add|without|extend)\b/i, label: "new types addable without modifying core" },
          { pattern: /\b(add|extend)\b.*\bnew\s*(payment|product|vehicle|type|method)\b/i, label: "extensibility for new types" },
          { pattern: /\bfactory\b/i, label: "Factory pattern" },
          { pattern: /\bdependency\s*inject/i, label: "dependency injection" },
          { pattern: /\bplug\s*-?\s*in\b/i, label: "plugin architecture" },
        ],
        negativeSignals: [
          { pattern: /\bhard[\s-]*coded?\b/i, label: "hard-coded logic" },
          { pattern: /\bif\s*\/?\s*else\s*(chain|block|ladder)\b/i, label: "if/else chains for type dispatch" },
          { pattern: /\bswitch\b.*\b(product|payment|vehicle|type)\b/i, label: "switch on type instead of polymorphism" },
          { pattern: /\b(product|payment|vehicle)\b.*\bswitch\b/i, label: "type-switched dispatch" },
          { pattern: /\btightly\s*coupled\b/i, label: "tightly coupled implementations" },
          { pattern: /\brequires?\s*(modif|chang)\b.*\b(vending|parking|elevator|main|core)\b/i, label: "adding variations requires modifying core class" },
          { pattern: /\bno\s*(interface|abstraction|extensib)\b/i, label: "no extensibility mechanisms" },
        ],
        missingEvidenceNote:
          "No evidence of extensibility mechanisms (interfaces, abstract classes, strategy pattern) found in the submission.",
        baseSuggestion:
          "Introduce interfaces at key variation points so new implementations can be added without modifying existing classes. Consider Strategy or State patterns where behavior varies.",
      },

      "Edge Case Awareness": {
        positiveSignals: [
          // Vending Machine edge cases
          { pattern: /\binsufficient\s*payment\b/i, label: "insufficient payment handling" },
          { pattern: /\bexact\s*(payment|change)\b/i, label: "exact payment handling" },
          { pattern: /\bcannot\s*(make|return)\s*change\b/i, label: "cannot-make-change scenario" },
          { pattern: /\bout[\s-]*of[\s-]*stock\b/i, label: "out-of-stock handling" },
          { pattern: /\b(cancel|refund)\b/i, label: "cancellation/refund handling" },
          { pattern: /\binvalid\s*(product|code|vehicle|input|request)\b/i, label: "invalid input handling" },
          { pattern: /\binvalid\s*state\b/i, label: "invalid state transition handling" },
          { pattern: /\bduplicate\s*(dispens|exit|entry)\b/i, label: "duplicate operation prevention" },
          { pattern: /\binventory\s*decrement\b/i, label: "inventory decrement correctness" },
          // Parking Lot edge cases
          { pattern: /\bfull\s*(lot|parking|garage)\b/i, label: "full lot handling" },
          { pattern: /\bdouble\s*(exit|entry)\b/i, label: "double exit/entry prevention" },
          { pattern: /\bconcurren/i, label: "concurrency awareness" },
          { pattern: /\brace\s*condition\b/i, label: "race condition handling" },
          { pattern: /\boverflow\b/i, label: "overflow handling" },
          { pattern: /\btimeout\b/i, label: "timeout handling" },
          { pattern: /\berror\s*handling\b/i, label: "explicit error handling" },
          { pattern: /\bedge\s*case/i, label: "explicit edge case discussion" },
          { pattern: /\bboundary\b/i, label: "boundary condition awareness" },
          // Elevator edge cases
          { pattern: /\bemergency\b/i, label: "emergency scenario handling" },
          { pattern: /\boverload\b/i, label: "overload handling" },
        ],
        negativeSignals: [
          { pattern: /\b(only|just)\s*(happy|normal|basic)\s*path\b/i, label: "only happy path mentioned" },
          { pattern: /\bno\s*(edge|error|exception|refund|change\s*fail)\b/i, label: "missing edge case coverage" },
          { pattern: /\bdoes\s*not\s*(address|handle|mention)\b/i, label: "explicitly unhandled scenarios" },
        ],
        missingEvidenceNote:
          "No edge cases or error scenarios are discussed in the submission.",
        baseSuggestion:
          "Address common failure scenarios: invalid inputs, resource exhaustion, concurrent access, and cancellation/rollback. Explain how each edge case is handled in your design.",
      },

      // =============================================
      // PARKING LOT SPECIFIC DIMENSIONS
      // =============================================

      "Vehicle Type Polymorphism": {
        positiveSignals: [
          { pattern: /\bvehicle\b.*\b(abstract|base|parent|super)\b/i, label: "Vehicle as abstract/base class" },
          { pattern: /\b(abstract|base)\b.*\bvehicle\b/i, label: "abstract Vehicle hierarchy" },
          { pattern: /\bcar\b.*\b(extends?|subclass|inherit)/i, label: "Car extends Vehicle" },
          { pattern: /\bmotorcycle\b.*\b(extends?|subclass|inherit)/i, label: "Motorcycle extends Vehicle" },
          { pattern: /\btruck\b.*\b(extends?|subclass|inherit)/i, label: "Truck extends Vehicle" },
          { pattern: /\bcar\s*spot\b/i, label: "CarSpot subclass" },
          { pattern: /\bbike\s*spot\b/i, label: "BikeSpot subclass" },
          { pattern: /\btruck\s*spot\b/i, label: "TruckSpot subclass" },
          { pattern: /\bpolymorphi/i, label: "polymorphism usage" },
          { pattern: /\bvehicle\s*type\b.*\b(abstract|interface|polymorphi|inherit)/i, label: "vehicle type via polymorphism" },
          { pattern: /\bstrategy\b.*\b(spot|allocat|pricing)\b/i, label: "Strategy pattern for spot/pricing" },
          { pattern: /\b(spot|allocat|pricing)\b.*\bstrategy\b/i, label: "spot/pricing strategy" },
          { pattern: /\boverride\b/i, label: "method overriding" },
        ],
        negativeSignals: [
          { pattern: /\bvehicle\s*type\b.*\bif\s*\/?\s*else\b/i, label: "vehicleType dispatched via if/else" },
          { pattern: /\bif\s*\/?\s*else\b.*\bvehicle\s*type\b/i, label: "if/else chains for vehicle types" },
          { pattern: /\bswitch\b.*\bvehicle/i, label: "switch on vehicle type" },
          { pattern: /\bvehicle\b.*\bswitch\b/i, label: "vehicle type switch statement" },
          { pattern: /\bstring\b.*\bvehicle\s*type\b/i, label: "vehicle type as raw string" },
          { pattern: /\benum\b.*\bvehicle\s*type\b.*\bif\b/i, label: "enum-based type checking with conditionals" },
        ],
        missingEvidenceNote:
          "No vehicle type abstraction or polymorphic handling described in the submission.",
        baseSuggestion:
          "Create a Vehicle base class or interface with type-specific subclasses (Car, Motorcycle, Truck). Use polymorphism for behavior that varies by vehicle type instead of if/else or switch statements.",
      },

      // =============================================
      // ELEVATOR SYSTEM SPECIFIC DIMENSIONS
      // =============================================

      "Scheduling Strategy": {
        positiveSignals: [
          { pattern: /\bscan\b/i, label: "SCAN algorithm" },
          { pattern: /\blook\b/i, label: "LOOK algorithm" },
          { pattern: /\bshortest[\s-]*seek\b/i, label: "Shortest Seek Time First" },
          { pattern: /\bscheduling\s*strategy\b/i, label: "SchedulingStrategy abstraction" },
          { pattern: /\bscheduler\b/i, label: "Scheduler class" },
          { pattern: /\b(dispatch|assign)\b.*\b(algorithm|strategy|logic)\b/i, label: "dispatch/assignment strategy" },
          { pattern: /\b(algorithm|strategy)\b.*\b(dispatch|assign)\b/i, label: "strategic elevator assignment" },
          { pattern: /\bswappable\b.*\bstrateg/i, label: "swappable scheduling strategies" },
          { pattern: /\bstrateg\b.*\bswappable\b/i, label: "strategy interchangeability" },
          { pattern: /\bminimiz\b.*\b(wait|travel)\b/i, label: "wait/travel time minimization" },
          { pattern: /\b(fcfs|fifo|priority\s*queue)\b/i, label: "queue-based scheduling" },
          { pattern: /\bdirection\b.*\b(optim|continu|same)\b/i, label: "directional optimization" },
          { pattern: /\b(optim|continu|same)\b.*\bdirection\b/i, label: "direction-based optimization" },
        ],
        negativeSignals: [
          { pattern: /\b(random|arbitrary)\b.*\bassign/i, label: "random/arbitrary elevator assignment" },
          { pattern: /\bno\s*(scheduling|strategy|algorithm)\b/i, label: "no scheduling strategy described" },
          { pattern: /\bhard[\s-]*coded?\b.*\b(assign|dispatch|schedul)\b/i, label: "hard-coded scheduling logic" },
        ],
        missingEvidenceNote:
          "No scheduling strategy or elevator assignment algorithm is described in the submission.",
        baseSuggestion:
          "Define a SchedulingStrategy interface with concrete implementations (SCAN, LOOK, ShortestSeekTime). The ElevatorController should delegate assignment decisions to the strategy, making it easy to swap algorithms.",
      },

      "Concurrency Awareness": {
        positiveSignals: [
          { pattern: /\bconcurren/i, label: "concurrency awareness" },
          { pattern: /\bthread[\s-]*safe/i, label: "thread safety considerations" },
          { pattern: /\block\b/i, label: "locking mechanism" },
          { pattern: /\bmutex\b/i, label: "mutex usage" },
          { pattern: /\bsynchroniz/i, label: "synchronization" },
          { pattern: /\brace\s*condition/i, label: "race condition awareness" },
          { pattern: /\batomic\b/i, label: "atomic operations" },
          { pattern: /\bqueue\b/i, label: "queue-based request handling" },
          { pattern: /\bevent\b.*\b(driven|loop|queue)\b/i, label: "event-driven architecture" },
          { pattern: /\b(driven|loop|queue)\b.*\bevent\b/i, label: "event-based processing" },
          { pattern: /\basync\b/i, label: "asynchronous handling" },
          { pattern: /\bmessage\s*(passing|queue)\b/i, label: "message passing" },
          { pattern: /\bconcurrent\s*request/i, label: "concurrent request handling" },
        ],
        negativeSignals: [
          { pattern: /\bno\s*(concurren|thread|sync)\b/i, label: "no concurrency consideration" },
          { pattern: /\bsingle[\s-]*threaded?\b.*\b(only|assum)/i, label: "assumes single-threaded execution only" },
          { pattern: /\bignore\b.*\b(concurren|thread|race)\b/i, label: "concurrency explicitly ignored" },
        ],
        missingEvidenceNote:
          "No concurrency considerations or thread safety mechanisms are described in the submission.",
        baseSuggestion:
          "Address concurrent elevator requests: use thread-safe queues, synchronize shared state (elevator position, direction, requests), and consider race conditions when multiple requests arrive simultaneously.",
      },
    };

    return configs[dimensionName] || this.getGenericConfig(dimensionName);
  }

  // ============================================
  // Generic Fallback Configuration
  // ============================================

  private getGenericConfig(dimensionName: string): DimensionConfig {
    return {
      positiveSignals: [
        { pattern: /\binterface\b/i, label: "interface usage" },
        { pattern: /\babstract\b/i, label: "abstract class usage" },
        { pattern: /\bpattern\b/i, label: "design pattern reference" },
        { pattern: /\bencapsulat/i, label: "encapsulation" },
        { pattern: /\bsolid\b/i, label: "SOLID principles" },
        { pattern: /\bpolymorphi/i, label: "polymorphism" },
        { pattern: /\bseparation\b/i, label: "separation of concerns" },
        { pattern: /\bdelegate\b/i, label: "delegation" },
        { pattern: /\bcomposit/i, label: "composition" },
        { pattern: /\binherit/i, label: "inheritance" },
      ],
      negativeSignals: [
        { pattern: /\bgod\s*class\b/i, label: "god-class anti-pattern" },
        { pattern: /\btightly\s*coupled\b/i, label: "tight coupling" },
        { pattern: /\bhard[\s-]*coded?\b/i, label: "hard-coded logic" },
        { pattern: /\bno\s*separation\b/i, label: "no separation of concerns" },
      ],
      missingEvidenceNote: `No relevant evidence for "${dimensionName}" found in the submission.`,
      baseSuggestion: `Review best practices for ${dimensionName.toLowerCase()} and apply them to your design. Focus on clarity, separation of concerns, and flexibility.`,
    };
  }
}
