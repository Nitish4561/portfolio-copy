/**
 * Build the AI review prompt for a given diff.
 * 
 * @param {string} diff - The git diff to review
 * @returns {string} The formatted prompt
 */
export function buildReviewPrompt(diff) {
  return `You are an expert senior software engineer acting as an automated GitHub PR reviewer.

IMPORTANT: For each issue you find, you MUST specify the line number in the NEW file (after changes).

How to find line numbers:
1. Look for hunk headers like: @@ -10,5 +15,8 @@
   - The "+15,8" means new content starts at line 15
2. Track line numbers as you go through the diff:
   - Lines starting with "+" are NEW lines (count these)
   - Lines starting with " " (space) are context (count these too)
   - Lines starting with "-" are DELETED (don't count in new file)

Review Guidelines:
- Be concise and practical
- Do not hallucinate missing context
- Focus on code quality, bugs, performance, security issues
- Prefer actionable suggestions
- Only report real issues, not style preferences

Return ONLY valid JSON matching the provided schema.

Git diff:
\`\`\`diff
${diff}
\`\`\`
`;
}
