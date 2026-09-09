import {
  Evaluator,
  EvaluationResult,
  FeedbackItem,
  SubmissionContent,
  RubricDimension,
} from "./types";

/**
 * MockAIEvaluator — the default evaluator.
 *
 * Returns realistic, problem-aware structured feedback WITHOUT
 * making any external API calls. Demonstrates the Strategy pattern
 * and the full feedback structure. Varies feedback based on
 * submission content length and rubric dimensions.
 */
export class MockAIEvaluator implements Evaluator {
  async evaluate(
    submission: SubmissionContent,
    rubricDimensions: RubricDimension[]
  ): Promise<EvaluationResult> {
    // Simulate async delay (real AI would take 5-30s)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const feedback: FeedbackItem[] = rubricDimensions.map((dim) => {
      return this.generateFeedbackForDimension(dim, submission);
    });

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

  private generateFeedbackForDimension(
    dim: RubricDimension,
    submission: SubmissionContent
  ): FeedbackItem {
    // Content-aware scoring: longer, more detailed submissions score higher
    const totalLength =
      (submission.classes?.length || 0) +
      (submission.responsibilities?.length || 0) +
      (submission.relationships?.length || 0) +
      (submission.designDecisions?.length || 0);

    // Base score varies by content depth (with some randomness for realism)
    const contentFactor = Math.min(totalLength / 500, 1); // 0 to 1
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const rawScore = contentFactor * dim.maxScore * randomFactor;
    const score =
      Math.round(Math.min(Math.max(rawScore, 1), dim.maxScore) * 10) / 10;

    const feedbackTemplates = this.getTemplatesForDimension(dim.name);
    const quality =
      score / dim.maxScore > 0.7
        ? "good"
        : score / dim.maxScore > 0.4
          ? "moderate"
          : "needs_work";

    return {
      criterion: dim.name,
      score,
      maxScore: dim.maxScore,
      evidence: feedbackTemplates.evidence[quality],
      concern: feedbackTemplates.concern[quality],
      suggestion: feedbackTemplates.suggestion[quality],
      confidence: 0.75 + Math.random() * 0.15,
    };
  }

  private getTemplatesForDimension(dimensionName: string): {
    evidence: Record<string, string>;
    concern: Record<string, string>;
    suggestion: Record<string, string>;
  } {
    const templates: Record<
      string,
      {
        evidence: Record<string, string>;
        concern: Record<string, string>;
        suggestion: Record<string, string>;
      }
    > = {
      "Responsibility Clarity": {
        evidence: {
          good: "Classes have well-defined, single responsibilities. Each class name clearly communicates its purpose.",
          moderate:
            "Some classes have clear responsibilities, but a few seem to handle multiple concerns.",
          needs_work:
            "Class responsibilities are unclear or not well articulated.",
        },
        concern: {
          good: "Minor: consider whether any utility methods should be extracted into dedicated helper classes.",
          moderate:
            "Some classes appear to violate SRP — handling both business logic and data management.",
          needs_work:
            "Most classes lack clear responsibility boundaries, making the design hard to maintain.",
        },
        suggestion: {
          good: "Consider documenting the 'one sentence responsibility' for each class to maintain discipline as the design grows.",
          moderate:
            "Extract secondary responsibilities into separate classes. Apply SRP: each class should have one reason to change.",
          needs_work:
            "Start by listing what each class does. If a class does more than one thing, split it.",
        },
      },
      "Encapsulation & Information Hiding": {
        evidence: {
          good: "Internal state is properly hidden behind well-defined interfaces. Access is controlled through methods.",
          moderate:
            "Some encapsulation is present, but certain internal details are exposed unnecessarily.",
          needs_work:
            "Limited evidence of encapsulation. Internal state appears to be directly accessible.",
        },
        concern: {
          good: "Minor: ensure that collection fields return defensive copies rather than direct references.",
          moderate:
            "Some fields or internal structures are exposed, creating coupling between classes.",
          needs_work:
            "Without encapsulation, changes to one class will ripple through the entire design.",
        },
        suggestion: {
          good: "Good encapsulation. Consider using interfaces to further decouple components.",
          moderate:
            "Hide internal state behind getters/methods. Expose only what external classes need.",
          needs_work:
            "Define clear public interfaces for each class. Make fields private and provide controlled access methods.",
        },
      },
      "Extensibility & OCP": {
        evidence: {
          good: "Design uses abstraction (interfaces/abstract classes) to allow extension without modification.",
          moderate:
            "Some extensibility hooks are present, but parts of the design would require modification to extend.",
          needs_work:
            "Design appears rigid — adding new features would require modifying existing classes.",
        },
        concern: {
          good: "Minor: verify that all extension points are necessary and not speculative over-engineering.",
          moderate:
            "Key variation points (e.g., new types, new strategies) are not abstracted behind interfaces.",
          needs_work:
            "The design lacks extension points. Any new requirement would require rewriting existing code.",
        },
        suggestion: {
          good: "Well-designed extension points. Consider applying the Strategy or Template Method pattern for remaining variation points.",
          moderate:
            "Identify the likely change points and introduce interfaces there. Apply Open-Closed Principle.",
          needs_work:
            "Use interfaces and polymorphism instead of conditionals. Design for extension by identifying what varies.",
        },
      },
    };

    // Return matching template or a generic one
    return (
      templates[dimensionName] || {
        evidence: {
          good: "The submission addresses this dimension with sufficient detail and reasoning.",
          moderate:
            "The submission partially addresses this dimension but could be more thorough.",
          needs_work:
            "This dimension is insufficiently addressed in the submission.",
        },
        concern: {
          good: "No major concerns for this dimension.",
          moderate:
            "Some aspects of this dimension need improvement.",
          needs_work:
            "Significant improvement needed in this area.",
        },
        suggestion: {
          good: "Continue refining this aspect of the design in subsequent attempts.",
          moderate:
            "Review best practices for this dimension and apply them to your design.",
          needs_work:
            "Study examples of good designs and focus on this dimension in your next attempt.",
        },
      }
    );
  }
}
