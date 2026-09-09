import {
  Evaluator,
  EvaluationResult,
  SubmissionContent,
  RubricDimension,
} from "./types";
import { RuleBasedEvaluator } from "./rule-based-evaluator";
import { MockAIEvaluator } from "./mock-ai-evaluator";

/**
 * CompositeEvaluator — orchestrates multiple evaluators.
 *
 * Runs rule-based checks first (fast, deterministic),
 * then AI evaluation (slower, judgment-based).
 * Merges results and handles failures gracefully:
 * if AI fails, rule-based results are still returned as "Partial".
 */
export class CompositeEvaluator implements Evaluator {
  private ruleEvaluator: RuleBasedEvaluator;
  private aiEvaluator: Evaluator;

  constructor(aiEvaluator?: Evaluator) {
    this.ruleEvaluator = new RuleBasedEvaluator();
    this.aiEvaluator = aiEvaluator || new MockAIEvaluator();
  }

  async evaluate(
    submission: SubmissionContent,
    rubricDimensions: RubricDimension[]
  ): Promise<EvaluationResult> {
    // Phase 1: Rule-based (always succeeds)
    const ruleResult = await this.ruleEvaluator.evaluate(
      submission,
      rubricDimensions
    );

    // Phase 2: AI-based (may fail)
    let aiResult: EvaluationResult | null = null;
    try {
      aiResult = await this.aiEvaluator.evaluate(
        submission,
        rubricDimensions
      );
    } catch (error) {
      console.error("AI evaluator failed, returning partial results:", error);
    }

    // Merge results
    if (aiResult && aiResult.status === "Completed") {
      const allFeedback = [...ruleResult.feedback, ...aiResult.feedback];
      const totalScore = allFeedback.reduce((sum, f) => sum + f.score, 0);
      const totalMax = allFeedback.reduce((sum, f) => sum + f.maxScore, 0);

      return {
        overallScore:
          totalMax > 0
            ? Math.round((totalScore / totalMax) * 1000) / 10
            : 0,
        feedback: allFeedback,
        evaluatorType: "composite",
        status: "Completed",
      };
    }

    // AI failed — return rule-based only as Partial
    return {
      ...ruleResult,
      evaluatorType: "composite",
      status: aiResult ? "Partial" : "Partial",
    };
  }
}
