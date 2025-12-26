import OpenAI from "openai";
import { buildReviewPrompt } from "./prompt.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const FALLBACK_REVIEW = {
  summary: "AI review failed due to invalid response",
  quality_score: 0,
  should_block_merge: false,
  issues: [
    {
      severity: "low",
      description: "AI review could not be completed for this file",
      suggestion: "Check the workflow logs for errors. The file may be too large, the AI service may be unavailable, or the response format was invalid.",
      line: 1,
    },
  ],
  positive_notes: [],
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "quality_score",
    "should_block_merge",
    "issues",
    "positive_notes",
  ],
  properties: {
    summary: { type: "string" },
    quality_score: { type: "number" },
    should_block_merge: { type: "boolean" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "description", "suggestion", "line"],
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          suggestion: { type: "string" },
          line: { 
            type: "number",
            description: "The line number in the NEW file where the issue is located"
          },
        },
      },
    },
    positive_notes: {
      type: "array",
      items: { type: "string" },
    },
  },
};

/**
 * Create a fallback review object with error context.
 * 
 * @param {string} reason - The reason why the review failed
 * @returns {Object} Fallback review object with error details
 */
function createFallbackReview(reason = "Unknown error") {
  return {
    summary: `AI review failed: ${reason}`,
    quality_score: 0,
    should_block_merge: false,
    issues: [
      {
        severity: "low",
        description: "AI review could not be completed for this file",
        suggestion: `Reason: ${reason}. Check the workflow logs for more details. The file may be too large, the AI service may be unavailable, or the response format was invalid.`,
        line: 1,
      },
    ],
    positive_notes: [],
  };
}

export async function runReview(diff) {
  // Validate input
  if (!diff) {
    return createFallbackReview("No diff provided");
  }
  
  if (diff.length < 20) {
    return createFallbackReview("Diff too small");
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: buildReviewPrompt(diff),
      text: {
        format: {
          type: "json_schema",
          name: "pr_review",
          schema: REVIEW_SCHEMA,
        },
      },
    });

    const output =
      response.output_parsed ??
      (typeof response.output_text === "string"
        ? JSON.parse(response.output_text)
        : null);

    if (!output) {
      return createFallbackReview("Empty AI response");
    }

    return output;
  } catch (err) {
    // Provide more specific error context
    if (err.message.includes("API key")) {
      return createFallbackReview("Invalid or missing OpenAI API key");
    } else if (err.message.includes("timeout")) {
      return createFallbackReview("Request timeout");
    } else if (err.message.includes("rate limit")) {
      return createFallbackReview("Rate limit exceeded");
    } else {
      return createFallbackReview(err.message);
    }
  }
}
