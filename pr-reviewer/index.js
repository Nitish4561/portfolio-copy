import {
  getPullRequest,
  getPullRequestFiles,
  postInlineComment,
  postReviewComment,
  applyLabels,
} from "./github.js";

import { runReview } from "./llm.js";

async function main() {
  console.log("🚀 AI PR Reviewer started");

  // Get PR details to extract commit SHA
  const pr = await getPullRequest();
  const commit_id = pr.head.sha;
  console.log(`📌 Reviewing commit: ${commit_id.substring(0, 7)}`);

  // Fetch all changed files
  const files = await getPullRequestFiles();
  console.log(`📂 Found ${files.length} changed file(s)`);

  if (!files.length) {
    console.log("⚠️  No files to review");
    return;
  }

  let filesWithIssues = 0;
  let hasHighSeverity = false;
  let inlineCommentsFailed = 0;
  let inlineCommentsPosted = 0;

  // Review each file
  for (const file of files) {
    if (!file.patch) {
      console.log(`⏭️  Skipping ${file.filename} (no patch - likely binary or too large)`);
      continue;
    }

    console.log(`🔍 Reviewing ${file.filename}...`);

    // Run AI review on the file's patch
    const review = await runReview(file.patch);

    if (!review?.issues?.length) {
      console.log(`   ✅ No issues found`);
      continue;
    }

    filesWithIssues++;
    console.log(`   ⚠️  Found ${review.issues.length} issue(s)`);

    // Check for high severity issues
    if (review.issues.some(i => i.severity === "high")) {
      hasHighSeverity = true;
      console.log(`   🚨 High severity issue detected!`);
    }

    // Build comment body
    const body = `
⚠️ **AI Review Issues**

${review.issues
  .map(
    i =>
      `- **[${i.severity}]** ${i.description}\n👉 ${i.suggestion}`
  )
  .join("\n")}
`;

    // Try to post as inline comment
    const posted = await postInlineComment({
      body,
      path: file.filename,
      commit_id,
      patch: file.patch,
    });

    if (posted) {
      inlineCommentsPosted++;
    } else {
      // Fallback: post as regular PR comment with file context
      inlineCommentsFailed++;
      console.log(`   📝 Posting as general PR comment instead`);
      await postReviewComment(`📁 **${file.filename}**\n${body}`);
    }
  }

  // Post summary comment
  console.log("\n📝 Posting review summary...");
  await postReviewComment(`
🤖 **AI PR Review Summary**

${
  filesWithIssues > 0
    ? `❌ Issues found in **${filesWithIssues} file(s)**.`
    : `✅ No issues found across changed files.`
}

${inlineCommentsPosted > 0 ? `💬 Posted ${inlineCommentsPosted} inline comment(s)` : ''}
${inlineCommentsFailed > 0 ? `⚠️  ${inlineCommentsFailed} inline comment(s) failed (posted as general comments)` : ''}
`);

  // Apply labels based on review results
  console.log("🏷️  Applying labels...");
  await applyLabels(filesWithIssues, hasHighSeverity);

  // Final summary
  console.log("\n✅ Review finished successfully!");
  console.log(`   Files reviewed: ${files.filter(f => f.patch).length}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  console.log(`   High severity issues: ${hasHighSeverity ? 'Yes' : 'No'}`);
  console.log(`   Inline comments posted: ${inlineCommentsPosted}`);
  if (inlineCommentsFailed > 0) {
    console.log(`   ⚠️  Inline comments failed: ${inlineCommentsFailed}`);
  }
}

main().catch(err => {
  console.error("\n❌ Reviewer crashed with error:");
  console.error(err);
  process.exit(1);
});
