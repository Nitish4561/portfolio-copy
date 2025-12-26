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
import { generatePRReview } from "./pr-description.js";

async function main() {
  console.log("🚀 AI PR Reviewer started");

  const pr = await getPullRequest();
  const files = await getPullRequestFiles();
  const commit_id = pr.head.sha;

  /* ---------- OVERALL PR REVIEW ---------- */

  const SHOULD_GENERATE_REVIEW =
    !pr.body || pr.body.includes("<!-- ai-generated -->");

  let overallReview = null;

  if (SHOULD_GENERATE_REVIEW) {
    console.log("✍️ Generating overall PR review");

    overallReview = await generatePRReview({
      title: pr.title,
      originalBody: pr.body,
      files,
    });

    if (overallReview) {
      console.log("✅ Generated review:", JSON.stringify(overallReview, null, 2));
      console.log("📝 Updating PR description...");
      
      // Update PR description with just the summary
      await updatePRDescription(
        `<!-- ai-generated -->\n${overallReview.summary}`
      );
      
      console.log("✅ PR description updated successfully");
    } else {
      console.warn("⚠️ Failed to generate overall PR review - review will be skipped");
    }
  }


  let filesWithIssues = 0;
  let hasHighSeverity = false;
  let inlinePosted = 0;
  let inlineFailed = 0;

  for (const file of files) {
    if (!file.patch) continue;

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

  let summaryComment = `🤖 **AI PR Review**\n\n`;

  // Add overall review if available
  if (overallReview) {
    summaryComment += `**Summary:**\n${overallReview.summary}\n\n`;
    summaryComment += `**Quality Score:** ${overallReview.quality_score}/10\n`;
    summaryComment += `**Should Block Merge:** ${overallReview.should_block_merge ? "❌ Yes" : "✅ No"}\n\n`;
    
    if (overallReview.positive_notes && overallReview.positive_notes.length > 0) {
      summaryComment += overallReview.positive_notes.map(note => `- ${note}`).join("\n");
      summaryComment += "\n\n";
    }
    
    summaryComment += "---\n\n";
  }

  // Add file-level review summary
  summaryComment += `${
    filesWithIssues > 0
      ? `❌ Found **${filesWithIssues} file(s)** with issues.`
      : `✅ No issues found across changed files.`
  }\n\n`;
  
  summaryComment += `💬 Inline comments posted: **${inlinePosted}**\n`;
  summaryComment += `⚠️ Fallback comments: **${inlineFailed}**\n`;
  
  if (hasHighSeverity) {
    summaryComment += `\n🚨 High severity issues detected.`;
  }

  await postReviewComment(summaryComment);

  await applyLabels(filesWithIssues, hasHighSeverity);

}

main().catch(err => {
  console.error("❌ Reviewer crashed:", err);
  process.exit(1);
});
