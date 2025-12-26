// import OpenAI from "openai";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const FALLBACK_REVIEW = {
//   summary: "AI review failed due to invalid response",
//   quality_score: 0,
//   should_block_merge: false,
//   issues: [
//     {
//       severity: "low",
//       description: "AI review could not be generated",
//       suggestion: "Check workflow logs for LLM errors",
//     },
//   ],
//   positive_notes: [],
// };

// const REVIEW_SCHEMA = {
//   type: "object",
//   properties: {
//     summary: { type: "string" },
//     quality_score: { type: "number" },
//     should_block_merge: { type: "boolean" },
//     issues: {
//       type: "array",
//       items: {
//         type: "object",
//         properties: {
//           severity: { type: "string", enum: ["low", "medium", "high"] },
//           description: { type: "string" },
//           suggestion: { type: "string" },
//         },
//         required: ["severity", "description", "suggestion"],
//         additionalProperties: false,
//       },
//     },
//     positive_notes: { type: "array", items: { type: "string" } },
//   },
//   required: ["summary", "quality_score", "should_block_merge", "issues", "positive_notes"],
//   additionalProperties: false,
// };

// export async function runReview(diff) {
//   if (!diff || diff.length < 10) return FALLBACK_REVIEW;

//   const prompt = `
// You are a senior code reviewer. Analyze this git diff and return a single JSON object matching the schema:
// summary, quality_score (1-10), should_block_merge (boolean), issues, positive_notes.

// Git diff:
// \`\`\`diff
// ${diff}
// \`\`\`
// `;

//   try {
//     const response = await client.responses.create({
//       model: "gpt-4.1-mini",
//       input: prompt,
//       text: {
//         format: {
//           type: "json_schema",
//           name: "pr_review",
//           schema: REVIEW_SCHEMA,
//         },
//       },
//     });

//     const outputText = response.output_text || response.output_parsed;
    
//     if (!outputText) {
//       return FALLBACK_REVIEW;
//     }

//     // Parse JSON if it's a string
//     const parsed = typeof outputText === 'string' ? JSON.parse(outputText) : outputText;
//     return parsed;
//   } catch (err) {
//     return FALLBACK_REVIEW;
//   }
// }
// import OpenAI from "openai";
// import { splitDiffByFile } from "./diff.js";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const FALLBACK_FILE_REVIEW = {
//   issues: [],
//   positives: [],
// };

// const FILE_REVIEW_SCHEMA = {
//   type: "object",
//   properties: {
//     issues: {
//       type: "array",
//       items: {
//         type: "object",
//         properties: {
//           severity: { type: "string", enum: ["low", "medium", "high"] },
//           description: { type: "string" },
//           suggestion: { type: "string" },
//         },
//         required: ["severity", "description", "suggestion"],
//         additionalProperties: false,
//       },
//     },
//     positives: {
//       type: "array",
//       items: { type: "string" },
//     },
//   },
//   required: ["issues", "positives"],
//   additionalProperties: false,
// };

// function buildFilePrompt(path, diff) {
//   return `
// You are a senior code reviewer.

// Review ONLY the following file diff.
// Return a single JSON object with:
// - issues
// - positives

// If there are no issues, return empty arrays.

// File: ${path}

// Diff:
// \`\`\`diff
// ${diff}
// \`\`\`
// `;
// }

// async function reviewSingleFile(file) {
//   try {
//     const response = await client.responses.create({
//       model: "gpt-4.1-mini",
//       input: buildFilePrompt(file.path, file.diff),
//       text: {
//         format: {
//           type: "json_schema",
//           name: "file_review",
//           schema: FILE_REVIEW_SCHEMA,
//         },
//       },
//     });

//     const parsed = response.output_parsed;
//     if (!parsed) return FALLBACK_FILE_REVIEW;

//     return {
//       path: file.path,
//       issues: parsed.issues,
//       positives: parsed.positives,
//     };
//   } catch {
//     return {
//       path: file.path,
//       ...FALLBACK_FILE_REVIEW,
//     };
//   }
// }

// export async function runReview(diff) {
//   const files = splitDiffByFile(diff);
//   const reviews = [];

//   for (const file of files) {
//     const result = await reviewSingleFile(file);
//     reviews.push(result);
//   }

//   const filesWithIssues = reviews.filter(r => r.issues.length > 0);

//   return {
//     files: reviews,
//     summary:
//       filesWithIssues.length === 0
//         ? "No issues found across changed files."
//         : `${filesWithIssues.length} file(s) have review comments.`,
//     should_block_merge: reviews.some(r =>
//       r.issues.some(i => i.severity === "high")
//     ),
//   };
// }
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const FALLBACK_REVIEW = {
  summary: "AI review failed due to invalid response",
  quality_score: 0,
  should_block_merge: false,
  issues: [],
  positive_notes: [],
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "quality_score",
    "should_block_merge",
    "issues",
    "positive_notes",
  ],
  properties: {
    summary: { type: "string" },
    quality_score: { type: "number" },
    should_block_merge: { type: "boolean" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "description", "suggestion"],
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
    positive_notes: {
      type: "array",
      items: { type: "string" },
    },
  },
};

export async function runReview(diff) {
  if (!diff || diff.length < 20) return FALLBACK_REVIEW;

  const prompt = `
You are a senior software engineer reviewing a single file diff.

Return ONLY a JSON object matching the schema.
Focus on real issues (duplication, bugs, bad patterns).

Git diff:
\`\`\`diff
${diff}
\`\`\`
`;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "pr_review",
          schema: REVIEW_SCHEMA,
        },
      },
    });

    const output =
      response.output_parsed ??
      (typeof response.output_text === "string"
        ? JSON.parse(response.output_text)
        : null);

    return output || FALLBACK_REVIEW;
  } catch (err) {
    console.error("❌ runReview failed:", err.message);
    return FALLBACK_REVIEW;
  }
}
