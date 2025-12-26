import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function rewritePRDescription({
  title,
  originalBody,
  files,
}) {
  const fileList = files
    .slice(0, 20)
    .map(f => `- ${f.filename} (${f.status})`)
    .join("\n");

  const prompt = `
You are a senior engineer rewriting a GitHub Pull Request description.

Goals:
- Be concise
- Be clear
- Use proper Markdown
- Do NOT invent features
- If original description exists, improve it
- If empty, create a good one

PR Title:
"${title}"

Original PR Description:
"""
${originalBody || "(empty)"}
"""

Changed Files:
${fileList}

Return ONLY the rewritten PR description in Markdown.
`;

  const res = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  return res.output_text?.trim();
}
