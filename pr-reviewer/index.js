import {
  getPullRequest,
  getPullRequestFiles,
  postInlineComment,
  postInlineCommentAtLine,
  postReviewComment,
  applyLabels,
} from "./github.js";

import { runReview } from "./llm.js";

async function main() {
  // Get PR details to extract commit SHA
  const pr = await getPullRequest();
  const commit_id = pr.head.sha;

  // Fetch all changed files
  const files = await getPullRequestFiles();

  if (!files.length) {
    return;
  }

  let filesWithIssues = 0;
  let hasHighSeverity = false;
  let inlineCommentsFailed = 0;
  let inlineCommentsPosted = 0;

  // Review each file
  for (const file of files) {
    if (!file.patch) {
      continue;
    }

    // Run AI review on the file's patch
    const review = await runReview(file.patch);

    if (!review?.issues?.length) {
      continue;
    }

    filesWithIssues++;

    // Check for high severity issues
    if (review.issues.some(i => i.severity === "high")) {
      hasHighSeverity = true;
    }

    // Post individual inline comments for each issue
    for (const issue of review.issues) {
      const body = `**[${issue.severity.toUpperCase()}]** ${issue.description}

💡 **Suggestion:** ${issue.suggestion}`;

      let posted = false;

      // Try to post at the specific line if provided by AI
      if (issue.line && issue.line > 0) {
        posted = await postInlineCommentAtLine({
          body,
          path: file.filename,
          commit_id,
          line: issue.line,
          patch: file.patch,
        });
      }

      // Fallback: try posting at first safe line
      if (!posted) {
        posted = await postInlineComment({
          body,
          path: file.filename,
          commit_id,
          patch: file.patch,
        });
      }

      if (posted) {
        inlineCommentsPosted++;
      } else {
        // Last resort: post as regular PR comment
        inlineCommentsFailed++;
        await postReviewComment(`📁 **${file.filename}** (line ${issue.line || '?'})\n\n${body}`);
      }
    }
  }

  // Post summary comment
  const totalIssues = inlineCommentsPosted + inlineCommentsFailed;
  await postReviewComment(`
🤖 **AI PR Review Summary**

${
  filesWithIssues > 0
    ? `❌ Found **${totalIssues} issue(s)** across **${filesWithIssues} file(s)**.`
    : `✅ No issues found across changed files.`
}

${inlineCommentsPosted > 0 ? `💬 **${inlineCommentsPosted}** inline comment(s) posted` : ''}${inlineCommentsFailed > 0 ? `\n⚠️  **${inlineCommentsFailed}** comment(s) posted as general comments (couldn't place inline)` : ''}
${hasHighSeverity ? '\n🚨 **High severity issues detected** - review recommended before merge' : ''}
`);

  // Apply labels based on review results
  await applyLabels(filesWithIssues, hasHighSeverity);
}

main().catch(err => {
  console.error("❌ Reviewer failed:", err);
  process.exit(1);
});
