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

export async function runReview(diff) {
  if (!diff || diff.length < 20) return FALLBACK_REVIEW;

  const prompt = `
You are a senior software engineer reviewing a single file diff.

IMPORTANT: For each issue you find, you MUST specify the line number in the NEW file (after changes).

How to find line numbers:
1. Look for hunk headers like: @@ -10,5 +15,8 @@
   - The "+15,8" means new content starts at line 15
2. Track line numbers as you go through the diff:
   - Lines starting with "+" are NEW lines (count these)
   - Lines starting with " " (space) are context (count these too)
   - Lines starting with "-" are DELETED (don't count in new file)

Return ONLY a JSON object matching the schema.
Focus on real issues (duplication, bugs, bad patterns, security issues).

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
