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
        console.log(`   📝 Posting issue as general comment`);
        await postReviewComment(`📁 **${file.filename}** (line ${issue.line || '?'})\n\n${body}`);
      }
    }
  }

  // Post summary comment
  console.log("\n📝 Posting review summary...");
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
  console.log("🏷️  Applying labels...");
  await applyLabels(filesWithIssues, hasHighSeverity);

  // Final summary
  const totalIssuesFound = inlineCommentsPosted + inlineCommentsFailed;
  console.log("\n✅ Review finished successfully!");
  console.log(`   Files reviewed: ${files.filter(f => f.patch).length}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  console.log(`   Total issues found: ${totalIssuesFound}`);
  console.log(`   High severity issues: ${hasHighSeverity ? 'Yes' : 'No'}`);
  console.log(`   Inline comments posted: ${inlineCommentsPosted}`);
  if (inlineCommentsFailed > 0) {
    console.log(`   ⚠️  Comments as general (not inline): ${inlineCommentsFailed}`);
  }
}

main().catch(err => {
  console.error("\n❌ Reviewer crashed with error:");
  console.error(err);
  process.exit(1);
});
