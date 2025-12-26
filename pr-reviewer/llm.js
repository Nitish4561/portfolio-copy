import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const FALLBACK_REVIEW = {
  summary: "AI review failed due to invalid response",
  quality_score: 0,
  should_block_merge: false,
  issues: [],
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
        required: ["severity", "description", "suggestion"],
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          suggestion: { type: "string" },
          line: { 
            type: "number",
            description: "Optional: Line number in the NEW file where the issue occurs"
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

export async function runReview(diff) {
  if (!diff || diff.length < 20) return FALLBACK_REVIEW;

  const prompt = `
You are a senior software engineer reviewing a single file diff.

Return ONLY a JSON object matching the schema.
Focus on real issues (duplication, bugs, bad patterns, security concerns).

For each issue:
- Provide the severity (low/medium/high)
- Give a clear description of the problem
- Suggest how to fix it
- OPTIONALLY include the line number in the NEW file (+) where the issue occurs

Git diff:
\`\`\`diff
${diff}
\`\`\`
`;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
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

    return output || FALLBACK_REVIEW;
  } catch (err) {
    console.error("❌ runReview failed:", err.message);
    return FALLBACK_REVIEW;
  }
}
