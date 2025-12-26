import {
  getPullRequest,
  getPullRequestFiles,
  postInlineComment,
  postInlineCommentAtLine,
  postReviewComment,
  updatePRDescription,
  applyLabels,
} from "./github.js";

import { runReview } from "./llm.js";
import { rewritePRDescription } from "./pr-description.js";

async function main() {
  console.log("🚀 AI PR Reviewer started");

  const pr = await getPullRequest();
  const files = await getPullRequestFiles();
  const commit_id = pr.head.sha;

  /* ---------- PR DESCRIPTION AUTO-REWRITE ---------- */

  const SHOULD_REWRITE =
    !pr.body || pr.body.includes("<!-- ai-generated -->");

  if (SHOULD_REWRITE) {
    console.log("✍️ Rewriting PR description");

    const newBody = await rewritePRDescription({
      title: pr.title,
      originalBody: pr.body,
      files,
    });

    if (newBody) {
      await updatePRDescription(
        `<!-- ai-generated -->\n${newBody}`
      );
    }
  }

  /* ---------- FILE REVIEWS ---------- */

  let filesWithIssues = 0;
  let hasHighSeverity = false;
  let inlinePosted = 0;
  let inlineFailed = 0;

  for (const file of files) {
    if (!file.patch) continue;

    console.log("🔍 Reviewing", file.filename);

    const review = await runReview(file.patch);

    if (!review?.issues?.length) continue;

    filesWithIssues++;

    if (review.issues.some(i => i.severity === "high")) {
      hasHighSeverity = true;
    }

    for (const issue of review.issues) {
      const body = `**[${issue.severity.toUpperCase()}]**
${issue.description}

💡 **Suggestion**
${issue.suggestion}`;

      let success = false;

      if (issue.line) {
        success = await postInlineCommentAtLine({
          body,
          path: file.filename,
          commit_id,
          line: issue.line,
          patch: file.patch,
        });
      }

      if (!success) {
        success = await postInlineComment({
          body,
          path: file.filename,
          commit_id,
          patch: file.patch,
        });
      }

      if (success) {
        inlinePosted++;
      } else {
        inlineFailed++;
        await postReviewComment(
          `📁 **${file.filename}**\n\n${body}`
        );
      }
    }
  }

  /* ---------- SUMMARY ---------- */

  await postReviewComment(`
🤖 **AI PR Review Summary**

${
  filesWithIssues > 0
    ? `❌ Found **${filesWithIssues} file(s)** with issues.`
    : `✅ No issues found across changed files.`
}

💬 Inline comments posted: **${inlinePosted}**
⚠️ Fallback comments: **${inlineFailed}**
${hasHighSeverity ? "\n🚨 High severity issues detected." : ""}
`);

  await applyLabels(filesWithIssues, hasHighSeverity);

  console.log("✅ AI PR Review completed");
}

main().catch(err => {
  console.error("❌ Reviewer crashed:", err);
  process.exit(1);
});
