import OpenAI from "openai";

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
      description: "AI review could not be generated",
      suggestion: "Check workflow logs for LLM errors",
    },
  ],
  positive_notes: [],
};

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    quality_score: { type: "number" },
    should_block_merge: { type: "boolean" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["severity", "description", "suggestion"],
        additionalProperties: false,
      },
    },
    positive_notes: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "quality_score", "should_block_merge", "issues", "positive_notes"],
  additionalProperties: false,
};

export async function runReview(diff) {
  if (!diff || diff.length < 10) return FALLBACK_REVIEW;

  const prompt = `
You are a senior code reviewer. Analyze this git diff and return a single JSON object matching the schema:
summary, quality_score (1-10), should_block_merge (boolean), issues, positive_notes.

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

    const outputText = response.output_text || response.output_parsed;
    
    if (!outputText) {
      return FALLBACK_REVIEW;
    }

    // Parse JSON if it's a string
    const parsed = typeof outputText === 'string' ? JSON.parse(outputText) : outputText;
    return parsed;
  } catch (err) {
    return FALLBACK_REVIEW;
  }
}
