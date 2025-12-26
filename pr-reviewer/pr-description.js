import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PR_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "quality_score",
    "should_block_merge",
    "positive_notes",
  ],
  properties: {
    summary: { 
      type: "string",
      description: "A comprehensive summary of what this PR does"
    },
    quality_score: { 
      type: "number",
      description: "Score from 0-10"
    },
    should_block_merge: { 
      type: "boolean",
      description: "Whether this PR should be blocked from merging"
    },
    positive_notes: {
      type: "array",
      items: { type: "string" },
      description: "List of positive aspects of this PR"
    },
  },
};

export async function generatePRReview({
  title,
  originalBody,
  files,
}) {
  const fileList = files
    .slice(0, 20)
    .map(f => `- ${f.filename} (${f.status})`)
    .join("\n");

  const prompt = `
You are a senior engineer reviewing a GitHub Pull Request.

Analyze the PR and provide:
1. A comprehensive summary of what this PR does
2. An overall quality score (0-10)
3. Whether merge should be blocked
4. Positive aspects of the changes

PR Title:
"${title}"

Original PR Description:
"""
${originalBody || "(empty)"}
"""

Changed Files:
${fileList}

Provide a thorough analysis focusing on the overall impact and purpose of these changes.
`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pr_review",
          schema: PR_REVIEW_SCHEMA,
          strict: true,
        },
      },
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (err) {
    console.error("Failed to generate PR review:", err);
    return null;
  }
}
