// import {
//   getPullRequest,
//   getPullRequestFiles,
//   postInlineComment,
//   postReviewComment,
//   applyLabels,
// } from "./github.js";
// import { runReview } from "./llm.js";

// async function main() {
//   console.log("🚀 AI PR Reviewer started");

//   // Get PR details to extract commit SHA
//   const pr = await getPullRequest();
//   const commit_id = pr.head.sha;
//   console.log("📌 Latest commit:", commit_id);

//   const files = await getPullRequestFiles();

//   if (!files.length) {
//     console.log("No files changed");
//     return;
//   }

//   let filesWithIssues = 0;
//   let hasHighSeverity = false;

//   for (const file of files) {
//     if (!file.patch) continue; // binary / large files

//     console.log("🔍 Reviewing", file.filename);

//     const review = await runReview(file.patch);

//     if (!review.issues?.length) continue;

//     filesWithIssues++;
    
//     // Check for high severity issues
//     if (review.issues.some(issue => issue.severity === "high")) {
//       hasHighSeverity = true;
//     }

//     const body = `
// ⚠️ **AI Review Issues**

// ${review.issues
//   .map(
//     i =>
//       `- **[${i.severity}]** ${i.description}\n👉 ${i.suggestion}`
//   )
//   .join("\n")}
// `;

//     await postInlineComment({
//       body,
//       path: file.filename,
//       commit_id,
//       patch: file.patch,
//     });
//   }

//   await postReviewComment(`
// 🤖 **AI PR Review Summary**

// ${
//   filesWithIssues > 0
//     ? `❌ Issues found in **${filesWithIssues} file(s)**. See inline comments.`
//     : `✅ No issues found across changed files.`
// }
// `);

//   // Apply labels based on review results
//   console.log("🏷️  Applying labels...");
//   await applyLabels(filesWithIssues, hasHighSeverity);
//   console.log("✅ Labels applied");

//   console.log("✅ Review finished");
// }

// main().catch(err => {
//   console.error("❌ Reviewer crashed:", err);
//   process.exit(1);
// });
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

  const pr = await getPullRequest();
  const commit_id = pr.head.sha;

  const files = await getPullRequestFiles();

  let filesWithIssues = 0;
  let hasHighSeverity = false;

  for (const file of files) {
    if (!file.patch) continue;

    console.log("🔍 Reviewing", file.filename);

    const review = await runReview(file.patch);
    if (!review?.issues?.length) continue;

    filesWithIssues++;

    if (review.issues.some(i => i.severity === "high")) {
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

    const posted = await postInlineComment({
      body,
      path: file.filename,
      commit_id,
      patch: file.patch,
    });

    if (!posted) {
      await postReviewComment(`📁 **${file.filename}**\n${body}`);
    }
  }

  await postReviewComment(`
🧾 **AI PR Review Summary**

${
  filesWithIssues > 0
    ? `❌ Issues found in **${filesWithIssues} file(s)**.`
    : `✅ No issues found across changed files.`
}
`);

  await applyLabels(filesWithIssues, hasHighSeverity);

  console.log("✅ Review finished");
}

main().catch(err => {
  console.error("❌ Reviewer crashed:", err);
  process.exit(1);
});
