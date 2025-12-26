// import { Octokit } from "@octokit/rest";

// const octokit = new Octokit({
//   auth: process.env.GITHUB_TOKEN
// });

// const owner = process.env.REPO_OWNER;
// const repo = process.env.REPO_NAME;
// const pull_number = Number(process.env.PR_NUMBER);

// export async function getPullRequest() {
//   const { data } = await octokit.rest.pulls.get({
//     owner,
//     repo,
//     pull_number
//   });
//   return data;
// }

// export async function getPullRequestDiff() {
//   const res = await octokit.request(
//     "GET /repos/{owner}/{repo}/pulls/{pull_number}",
//     {
//       owner,
//       repo,
//       pull_number,
//       headers: { accept: "application/vnd.github.v3.diff" }
//     }
//   );
//   return res.data;
// }

// export async function postReviewComment(body) {
//   await octokit.rest.issues.createComment({
//     owner,
//     repo,
//     issue_number: pull_number,
//     body
//   });
// }

// export async function postFileComment({ path, body }) {
//   await octokit.request(
//     "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
//     {
//       owner,
//       repo,
//       pull_number,
//       body,
//       path,
//       side: "RIGHT",
//       line: 1
//     }
//   );
// }

// export async function applyLabels(review) {
//   let labels = [];

//   if (review.summary?.toLowerCase().includes("failed")) {
//     labels.push("ai-failed");
//   } else if (review.issues.length === 0) {
//     labels.push("ai-clean");
//   } else {
//     labels.push("ai-needs-attention");
//   }

//   await octokit.rest.issues.addLabels({
//     owner,
//     repo,
//     issue_number: pull_number,
//     labels
//   });
// }
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const pull_number = Number(process.env.PR_NUMBER);

export async function getPullRequest() {
  const res = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });
  return res.data;
}

export async function getPullRequestFiles() {
  const res = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
    per_page: 100,
  });
  return res.data;
}

/**
 * Extract the first valid line number from a git diff patch
 * Returns the line number of the first addition in the diff
 */
function getFirstLineFromPatch(patch) {
  if (!patch) return null;
  
  const lines = patch.split('\n');
  let currentLine = 0;
  
  for (const line of lines) {
    // Look for the hunk header (e.g., @@ -1,5 +1,7 @@)
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10);
      continue;
    }
    
    // If we've started tracking lines, check for additions or context
    if (currentLine > 0) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        // Found the first addition
        return currentLine;
      } else if (line.startsWith(' ')) {
        // Context line
        currentLine++;
      } else if (line.startsWith('+')) {
        currentLine++;
      }
    }
  }
  
  // If no addition found, return the first line from the first hunk
  const firstHunk = patch.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/m);
  return firstHunk ? parseInt(firstHunk[1], 10) : 1;
}

export async function postInlineComment({
  body,
  path,
  commit_id,
  patch,
}) {
  const line = getFirstLineFromPatch(patch);
  
  if (!line) {
    console.warn(`⚠️  Could not determine line number for ${path}, skipping inline comment`);
    return;
  }
  
  await octokit.rest.pulls.createReviewComment({
    owner,
    repo,
    pull_number,
    body,
    path,
    commit_id,
    line,
    side: "RIGHT",
  });
}

export async function postReviewComment(body) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body,
  });
}

export async function applyLabels(filesWithIssues, hasHighSeverity) {
  let labels = [];

  if (hasHighSeverity) {
    labels.push("ai-critical");
  } else if (filesWithIssues > 0) {
    labels.push("ai-needs-attention");
  } else {
    labels.push("ai-clean");
  }

  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: pull_number,
    labels,
  });
}
