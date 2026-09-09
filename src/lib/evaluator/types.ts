/**
 * Evaluator Interface & Types
 * 
 * Strategy pattern: all evaluators implement the same interface.
 * CompositeEvaluator orchestrates multiple evaluators.
 */

export interface FeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

export interface EvaluationResult {
  overallScore: number;
  feedback: FeedbackItem[];
  evaluatorType: string;
  status: "Completed" | "Failed" | "Partial";
}

export interface SubmissionContent {
  classes: string;
  responsibilities: string;
  relationships: string;
  designDecisions: string;
}

export interface RubricDimension {
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

/**
 * Evaluator interface — the Strategy pattern contract.
 * 
 * Any evaluator (rule-based, AI, human, peer) implements this.
 * The Attempt/Submission flow never depends on a specific evaluator.
 */
export interface Evaluator {
  evaluate(
    submission: SubmissionContent,
    rubricDimensions: RubricDimension[]
  ): Promise<EvaluationResult>;
}
