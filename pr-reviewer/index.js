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
  console.log("📌 Latest commit:", commit_id);

  const files = await getPullRequestFiles();

  if (!files.length) {
    console.log("No files changed");
    return;
  }

  let filesWithIssues = 0;
  let hasHighSeverity = false;

  for (const file of files) {
    if (!file.patch) continue; // binary / large files

    console.log("🔍 Reviewing", file.filename);

    const review = await runReview(file.patch);
    
    // Debug logging
    console.log(`📊 Review result for ${file.filename}:`, {
      issuesCount: review.issues?.length ?? 0,
      summary: review.summary,
      qualityScore: review.quality_score,
    });

    if (!review.issues?.length) {
      console.log(`ℹ️  No issues found in ${file.filename}`);
      continue;
    }

    filesWithIssues++;
    
    // Check for high severity issues
    if (review.issues.some(issue => issue.severity === "high")) {
      hasHighSeverity = true;
    }

    // Post separate inline comments for each issue
    // This improves visibility and makes it easier to address individual issues
    for (const issue of review.issues) {
      const body = `
⚠️ **AI Review - [${issue.severity.toUpperCase()}]**

**Issue:** ${issue.description}

**Suggestion:** ${issue.suggestion}
`;

      try {
        await postInlineComment({
          body,
          path: file.filename,
          commit_id,
          patch: file.patch,
          // Line number is automatically determined from the patch
        });
      } catch (err) {
        console.warn(`⚠️  Failed to post inline comment for ${file.filename}:`, err.message);
        // Continue with other issues even if one fails
      }
    }
  }

  await postReviewComment(`
🤖 **AI PR Review Summary**

${
  filesWithIssues > 0
    ? `❌ Issues found in **${filesWithIssues} file(s)**. See inline comments.`
    : `✅ No issues found across changed files.`
}
`);

  // Apply labels based on review results
  console.log("🏷️  Applying labels...");
  await applyLabels(filesWithIssues, hasHighSeverity);
  console.log("✅ Labels applied");

  console.log("✅ Review finished");
}

main().catch(err => {
  console.error("❌ Reviewer crashed:", err);
  process.exit(1);
});
