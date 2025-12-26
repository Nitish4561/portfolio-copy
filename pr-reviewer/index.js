// // import { getPullRequestDiff, postReviewComment, applyLabels } from "./github.js";
// // import { runReview, FALLBACK_REVIEW } from "./llm.js";

// // console.log("🔥 reviewer/index.js LOADED");

// // async function main() {
// //   console.log("🚀 Reviewer started");

// //   // Fetch the PR diff
// //   const diff = await getPullRequestDiff();
// //   console.log("📄 Diff length:", diff?.length ?? "undefined");

// //   // Skip very small diffs
// //   if (!diff || diff.length < 10) {
// //     console.log("⚠️ PR diff too small, skipping review.");
// //     return;
// //   }

// //   // Run the AI review
// //   const review = await runReview(diff);
// //   console.log("🤖 AI review completed:", review);

// //   // Build the PR comment
// //   const commentBody = `
// // ## 🤖 AI PR Review

// // **Summary:**  
// // ${review.summary ?? "No summary provided"}

// // **Quality Score:** ${review.quality_score ?? 0}/10  
// // **Should Block Merge:** ${review.should_block_merge ? "❌ Yes" : "✅ No"}

// // ### ⚠️ Issues
// // ${
// //   review.issues?.length > 0
// //     ? review.issues.map(i => `- [${i.severity}] ${i.description}\n  👉 ${i.suggestion}`).join("\n")
// //     : "_No issues found._"
// // }

// // ### 👍 Positives
// // ${
// //   review.positive_notes?.length > 0
// //     ? review.positive_notes.map(p => `- ${p}`).join("\n")
// //     : "_No positives mentioned._"
// // }
// // `;

// //   // Post the comment to GitHub
// //   console.log("📝 Posting PR comment...");
// //   await postReviewComment(commentBody);
// //   console.log("✅ PR comment posted");

// //   // Optional: Apply labels based on review
// //   if (typeof applyLabels === "function") {
// //     console.log("🏷️ Applying labels based on review...");
// //     await applyLabels(review);
// //     console.log("✅ Labels applied");
// //   }
// // }

// // main().catch(err => {
// //   console.error("❌ Reviewer failed:", err);
// //   process.exit(1);
// // });
// import { getPullRequestDiff, postReviewComment } from "./github.js";
// import { runReview } from "./llm.js";

// async function main() {
//   try {
//     console.log("🚀 Reviewer started");

//     const diff = await getPullRequestDiff();
//     const review = await runReview(diff);

//     let comment = `🤖 **AI PR Review**\n\n`;

//     for (const file of review.files) {
//       comment += `📁 **${file.path}**\n`;

//       if (file.issues.length === 0) {
//         comment += `✅ No issues found\n\n`;
//         continue;
//       }

//       for (const issue of file.issues) {
//         comment += `⚠️ **[${issue.severity}]** ${issue.description}\n`;
//         comment += `👉 ${issue.suggestion}\n\n`;
//       }
//     }

//     comment += `---\n🧾 **Summary**\n${review.summary}`;

//     await postReviewComment(comment);
//     console.log("✅ Review posted");
//   } catch (err) {
//     console.error("❌ Reviewer failed:", err);
//   }
// }

// main();
import {
  getPullRequest,
  getPullRequestFiles,
  postInlineComment,
  postReviewComment,
  applyLabels,
} from "./github.js";
import { runReview } from "./llm.js";

// Configuration
const VERBOSE = process.env.VERBOSE === "true" || process.env.VERBOSE === "1";
const MAX_PATCH_SIZE = 50000; // 50KB limit for patches to avoid API issues

/**
 * Log a message only if VERBOSE mode is enabled.
 * Set VERBOSE=true in environment to enable detailed logging.
 */
function log(...args) {
  if (VERBOSE) {
    console.log(...args);
  }
}

/**
 * Validate if a file patch is suitable for inline commenting.
 * 
 * @param {Object} file - File object from GitHub API
 * @returns {boolean} True if the patch can be processed
 */
function isValidPatchForComment(file) {
  // Skip files without patches (binary, renamed without changes, etc.)
  if (!file.patch) {
    log(`⏭️  Skipping ${file.filename}: no patch (binary or no content changes)`);
    return false;
  }
  
  // Check if patch is too large (GitHub API has limits)
  if (file.patch.length > MAX_PATCH_SIZE) {
    console.warn(`⚠️  Skipping ${file.filename}: patch too large (${file.patch.length} bytes)`);
    return false;
  }
  
  // Check if patch has valid hunks
  if (!file.patch.includes('@@')) {
    log(`⏭️  Skipping ${file.filename}: no valid diff hunks`);
    return false;
  }
  
  return true;
}

async function main() {
  console.log("🚀 AI PR Reviewer started");

  // Get PR details to extract commit SHA
  const pr = await getPullRequest();
  const commit_id = pr.head.sha;
  log("📌 Latest commit:", commit_id);

  const files = await getPullRequestFiles();

  if (!files.length) {
    console.log("ℹ️  No files changed in this PR");
    return;
  }

  console.log(`📂 Reviewing ${files.length} file(s)...`);

  let filesWithIssues = 0;
  let hasHighSeverity = false;
  let filesProcessed = 0;
  let filesSkipped = 0;

  for (const file of files) {
    // Validate patch before processing
    if (!isValidPatchForComment(file)) {
      filesSkipped++;
      continue;
    }

    log(`🔍 Reviewing ${file.filename}`);

    const review = await runReview(file.patch);

    if (!review.issues?.length) {
      log(`✅ ${file.filename}: No issues found`);
      filesProcessed++;
      continue;
    }

    filesWithIssues++;
    filesProcessed++;
    
    // Check for high severity issues
    if (review.issues.some(issue => issue.severity === "high")) {
      hasHighSeverity = true;
    }

    const body = `
⚠️ **AI Review Issues**

${review.issues
  .map(
    i =>
      `- **[${i.severity}]** ${i.description}\n👉 ${i.suggestion}`
  )
  .join("\n")}
`;

    try {
      await postInlineComment({
        body,
        path: file.filename,
        commit_id,
        patch: file.patch,
      });
      log(`💬 Posted comment on ${file.filename}`);
    } catch (error) {
      console.error(`❌ Failed to post comment on ${file.filename}:`, error.message);
    }
  }

  // Post summary comment
  const summaryMessage = `
🤖 **AI PR Review Summary**

${
  filesWithIssues > 0
    ? `❌ Issues found in **${filesWithIssues} file(s)**. See inline comments.`
    : `✅ No issues found across changed files.`
}

📊 **Stats:**
- Files reviewed: ${filesProcessed}
- Files with issues: ${filesWithIssues}
- Files skipped: ${filesSkipped}
${hasHighSeverity ? '\n⚠️ **Contains high-severity issues**' : ''}
`;

  await postReviewComment(summaryMessage);
  log("📝 Posted summary comment");

  // Apply labels based on review results
  // applyLabels expects: (filesWithIssues: number, hasHighSeverity: boolean)
  // See github.js for label definitions:
  //   - hasHighSeverity=true → "ai-critical"
  //   - filesWithIssues>0 → "ai-needs-attention"
  //   - else → "ai-clean"
  log("🏷️  Applying labels...");
  await applyLabels(filesWithIssues, hasHighSeverity);
  console.log("✅ Labels applied");

  console.log(`✅ Review finished: ${filesProcessed} files processed, ${filesWithIssues} with issues`);
}

main().catch(err => {
  console.error("❌ Reviewer crashed:", err);
  process.exit(1);
});
