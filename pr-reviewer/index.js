// import { getPullRequestDiff, postReviewComment, applyLabels } from "./github.js";
// import { runReview, FALLBACK_REVIEW } from "./llm.js";

// console.log("🔥 reviewer/index.js LOADED");

// async function main() {
//   console.log("🚀 Reviewer started");

//   // Fetch the PR diff
//   const diff = await getPullRequestDiff();
//   console.log("📄 Diff length:", diff?.length ?? "undefined");

//   // Skip very small diffs
//   if (!diff || diff.length < 10) {
//     console.log("⚠️ PR diff too small, skipping review.");
//     return;
//   }

//   // Run the AI review
//   const review = await runReview(diff);
//   console.log("🤖 AI review completed:", review);

//   // Build the PR comment
//   const commentBody = `
// ## 🤖 AI PR Review

// **Summary:**  
// ${review.summary ?? "No summary provided"}

// **Quality Score:** ${review.quality_score ?? 0}/10  
// **Should Block Merge:** ${review.should_block_merge ? "❌ Yes" : "✅ No"}

// ### ⚠️ Issues
// ${
//   review.issues?.length > 0
//     ? review.issues.map(i => `- [${i.severity}] ${i.description}\n  👉 ${i.suggestion}`).join("\n")
//     : "_No issues found._"
// }

// ### 👍 Positives
// ${
//   review.positive_notes?.length > 0
//     ? review.positive_notes.map(p => `- ${p}`).join("\n")
//     : "_No positives mentioned._"
// }
// `;

//   // Post the comment to GitHub
//   console.log("📝 Posting PR comment...");
//   await postReviewComment(commentBody);
//   console.log("✅ PR comment posted");

//   // Optional: Apply labels based on review
//   if (typeof applyLabels === "function") {
//     console.log("🏷️ Applying labels based on review...");
//     await applyLabels(review);
//     console.log("✅ Labels applied");
//   }
// }

// main().catch(err => {
//   console.error("❌ Reviewer failed:", err);
//   process.exit(1);
// });
import { getPullRequestDiff, postReviewComment } from "./github.js";
import { runReview } from "./llm.js";

async function main() {
  try {
    console.log("🚀 Reviewer started");

    const diff = await getPullRequestDiff();
    const review = await runReview(diff);

    let comment = `🤖 **AI PR Review**\n\n`;

    for (const file of review.files) {
      comment += `📁 **${file.path}**\n`;

      if (file.issues.length === 0) {
        comment += `✅ No issues found\n\n`;
        continue;
      }

      for (const issue of file.issues) {
        comment += `⚠️ **[${issue.severity}]** ${issue.description}\n`;
        comment += `👉 ${issue.suggestion}\n\n`;
      }
    }

    comment += `---\n🧾 **Summary**\n${review.summary}`;

    await postReviewComment(comment);
    console.log("✅ Review posted");
  } catch (err) {
    console.error("❌ Reviewer failed:", err);
  }
}

main();
