import {
  Evaluator,
  EvaluationResult,
  FeedbackItem,
  SubmissionContent,
  RubricDimension,
} from "./types";

/**
 * RuleBasedEvaluator — deterministic checks.
 *
 * Validates structural completeness, required sections,
 * class count, and relationship density. No external dependencies.
 */
export class RuleBasedEvaluator implements Evaluator {
  async evaluate(
    submission: SubmissionContent,
    rubricDimensions: RubricDimension[]
  ): Promise<EvaluationResult> {
    const feedback: FeedbackItem[] = [];

    // 1. Structural completeness — are all required sections present?
    const completeness = this.checkCompleteness(submission);
    feedback.push(completeness);

    // 2. Class identification — did the learner identify enough classes?
    const classCount = this.checkClassCount(submission);
    feedback.push(classCount);

    // 3. Relationship density — are classes connected or isolated?
    const relationships = this.checkRelationships(submission);
    feedback.push(relationships);

    // 4. Design decisions — did the learner articulate trade-offs?
    const decisions = this.checkDesignDecisions(submission);
    feedback.push(decisions);

    const totalScore = feedback.reduce((sum, f) => sum + f.score, 0);
    const totalMax = feedback.reduce((sum, f) => sum + f.maxScore, 0);
    const overallScore = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      feedback,
      evaluatorType: "rule-based",
      status: "Completed",
    };
  }

  private checkCompleteness(submission: SubmissionContent): FeedbackItem {
    const sections = [
      { key: "classes" as const, label: "Classes" },
      { key: "responsibilities" as const, label: "Responsibilities" },
      { key: "relationships" as const, label: "Relationships" },
      { key: "designDecisions" as const, label: "Design Decisions" },
    ];

    const filled = sections.filter(
      (s) => submission[s.key] && submission[s.key].trim().length > 10
    );
    const missing = sections.filter(
      (s) => !submission[s.key] || submission[s.key].trim().length <= 10
    );

    const score = (filled.length / sections.length) * 10;

    return {
      criterion: "Structural Completeness",
      score: Math.round(score * 10) / 10,
      maxScore: 10,
      evidence:
        filled.length === sections.length
          ? "All required sections are present and have meaningful content."
          : `Present: ${filled.map((s) => s.label).join(", ")}. Missing/sparse: ${missing.map((s) => s.label).join(", ")}.`,
      concern:
        missing.length > 0
          ? `${missing.length} section(s) are empty or too brief to evaluate.`
          : "None — all sections are adequately filled.",
      suggestion:
        missing.length > 0
          ? `Add content to: ${missing.map((s) => s.label).join(", ")}. Each section should describe your design thinking.`
          : "Good structural completeness. Consider adding more detail to shorter sections.",
      confidence: 1.0,
    };
  }

  private checkClassCount(submission: SubmissionContent): FeedbackItem {
    const classText = submission.classes || "";
    // Count class-like identifiers (words starting with uppercase, common class patterns)
    const classMatches = classText.match(
      /\b[A-Z][a-zA-Z]+(?:Service|Manager|Handler|Factory|Strategy|Observer|Controller|Model|Entity|Repository|Builder|Interface|Abstract|Impl|Adapter|Decorator|Command|State|Singleton)?\b/g
    );
    const uniqueClasses = new Set(classMatches || []);
    const count = uniqueClasses.size;

    let score: number;
    let concern: string;
    let suggestion: string;

    if (count === 0) {
      score = 0;
      concern = "No classes identified in the submission.";
      suggestion =
        "List the key classes in your design. For most LLD problems, 4-8 classes is typical.";
    } else if (count < 3) {
      score = 4;
      concern = `Only ${count} class(es) identified. Most LLD problems need 4-8 classes for proper separation of concerns.`;
      suggestion =
        "Consider whether any class has too many responsibilities that should be split.";
    } else if (count <= 8) {
      score = 8;
      concern = "None — good class count for an LLD problem.";
      suggestion =
        "Verify each class has a single, clear responsibility.";
    } else {
      score = 6;
      concern = `${count} classes identified. While thorough, too many classes can indicate over-engineering.`;
      suggestion =
        "Consider whether some classes can be merged or if the design is over-engineered for the requirements.";
    }

    return {
      criterion: "Class Identification",
      score,
      maxScore: 10,
      evidence: `${count} unique class(es) identified: ${[...uniqueClasses].slice(0, 8).join(", ")}${count > 8 ? "..." : ""}.`,
      concern,
      suggestion,
      confidence: 0.8,
    };
  }

  private checkRelationships(submission: SubmissionContent): FeedbackItem {
    const relText = submission.relationships || "";
    const length = relText.trim().length;

    // Check for relationship keywords
    const keywords = [
      "has",
      "contains",
      "uses",
      "extends",
      "implements",
      "depends",
      "aggregat",
      "composit",
      "inherit",
      "association",
      "interface",
    ];
    const foundKeywords = keywords.filter((k) =>
      relText.toLowerCase().includes(k)
    );

    let score: number;
    if (length < 20) {
      score = 0;
    } else if (foundKeywords.length < 2) {
      score = 4;
    } else if (foundKeywords.length < 4) {
      score = 7;
    } else {
      score = 9;
    }

    return {
      criterion: "Relationship Clarity",
      score,
      maxScore: 10,
      evidence:
        length < 20
          ? "Relationships section is empty or too brief."
          : `Relationship keywords found: ${foundKeywords.join(", ")}. Section length: ${length} characters.`,
      concern:
        score < 5
          ? "Class relationships are not sufficiently described."
          : "Relationships are described. Verify they match the class list.",
      suggestion:
        score < 5
          ? "Describe how your classes relate: composition, inheritance, dependency injection, etc."
          : "Consider adding a brief description of the direction and multiplicity of each relationship.",
      confidence: 0.7,
    };
  }

  private checkDesignDecisions(submission: SubmissionContent): FeedbackItem {
    const decText = submission.designDecisions || "";
    const length = decText.trim().length;

    const tradeoffKeywords = [
      "trade-off",
      "tradeoff",
      "chose",
      "alternative",
      "instead",
      "because",
      "reason",
      "pattern",
      "principle",
      "solid",
      "extensib",
      "maintain",
      "scalab",
    ];
    const found = tradeoffKeywords.filter((k) =>
      decText.toLowerCase().includes(k)
    );

    let score: number;
    if (length < 20) {
      score = 0;
    } else if (found.length < 2) {
      score = 4;
    } else if (found.length < 4) {
      score = 7;
    } else {
      score = 9;
    }

    return {
      criterion: "Design Decision Articulation",
      score,
      maxScore: 10,
      evidence:
        length < 20
          ? "Design decisions section is empty or too brief."
          : `Trade-off/reasoning keywords found: ${found.join(", ")}. Section length: ${length} characters.`,
      concern:
        score < 5
          ? "Design decisions and trade-offs are not articulated."
          : "Design reasoning is present. Check that trade-offs are explicitly stated.",
      suggestion:
        score < 5
          ? "Explain WHY you made key design choices. What alternatives did you consider? What patterns did you apply?"
          : "Strengthen by explicitly naming the design patterns used and the alternatives you rejected.",
      confidence: 0.7,
    };
  }
}
