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
    summary: { 
      type: "string",
      description: "Brief summary of the code review"
    },
    quality_score: { 
      type: "number",
      description: "Code quality score from 0-10"
    },
    should_block_merge: { 
      type: "boolean",
      description: "Whether this PR should be blocked from merging due to critical issues"
    },
    issues: {
      type: "array",
      description: "List of issues found in the code",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "description", "suggestion"],
        properties: {
          severity: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "Severity level of the issue"
          },
          description: { 
            type: "string",
            description: "Clear description of the problem"
          },
          suggestion: { 
            type: "string",
            description: "How to fix the issue"
          },
        },
      },
    },
    positive_notes: {
      type: "array",
      description: "Positive aspects of the code",
      items: { type: "string" },
    },
  },
};

export async function runReview(diff) {
  if (!diff || diff.length < 20) return FALLBACK_REVIEW;

  const prompt = `
You are a senior software engineer reviewing code changes in a pull request.

Analyze this git diff and identify real issues such as:
- Bugs and logic errors
- Security vulnerabilities
- Code duplication
- Bad patterns and anti-patterns
- Performance issues

For each issue found:
- Assign severity: "low", "medium", or "high"
- Provide a clear description of the problem
- Suggest a specific fix

Git diff:
\`\`\`diff
${diff}
\`\`\`
`;

  try {
    console.log("🤖 Calling OpenAI API...");
    const response = await client.beta.chat.completions.parse({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a senior software engineer reviewing code. Focus on real issues like bugs, security concerns, bad patterns, and code duplication."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pr_review",
          strict: true,
          schema: REVIEW_SCHEMA,
        },
      },
    });

    console.log("✅ OpenAI API response received");
    
    const output = response.choices[0]?.message?.parsed;

    if (!output) {
      console.warn("⚠️  OpenAI returned null output, using fallback");
      return FALLBACK_REVIEW;
    }
    
    console.log(`📝 Issues found: ${output.issues?.length ?? 0}`);
    return output;
  } catch (err) {
    console.error("❌ runReview failed:", err.message);
    console.error("Error details:", err);
    return FALLBACK_REVIEW;
  }
}
