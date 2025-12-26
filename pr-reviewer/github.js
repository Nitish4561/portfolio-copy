import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const pull_number = Number(process.env.PR_NUMBER);

/* -------------------- HELPERS -------------------- */

/**
 * Extract a safe line number from a git diff patch for inline commenting.
 * 
 * GitHub API requires inline comments to reference actual lines in the diff.
 * This function finds the first added line, or falls back to the first line
 * of the first hunk if no additions are found.
 * 
 * @param {string} patch - The git diff patch from GitHub API
 * @returns {number|null} Line number to comment on, or null if invalid patch
 * 
 * @example
 * // Patch: @@ -10,3 +15,5 @@
 * //          context line
 * //        + added line
 * // Returns: 16 (the added line)
 */
function getSafeLineFromPatch(patch) {
  if (!patch) return null;

  const lines = patch.split("\n");
  let newLine = null;

  for (const line of lines) {
    // Match hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }

    // Track line numbers after we've found a hunk
    if (newLine !== null) {
      // Found an addition (not a file marker like +++ b/file)
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return newLine; // Return first added line
      }
      // Context lines and additions increment the line counter
      if (line.startsWith(" ") || line.startsWith("+")) {
        newLine++;
      }
      // Deletions (lines starting with '-') don't affect new file line numbers
    }
  }

  // Fallback: return first line of first hunk if no additions found
  return newLine;
}

/* -------------------- API FUNCTIONS -------------------- */

/**
 * Fetch pull request details from GitHub.
 * 
 * @returns {Promise<Object>} PR data including head SHA, base branch, etc.
 */
export async function getPullRequest() {
  const res = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });
  return res.data;
}

/**
 * Fetch the list of files changed in the pull request.
 * 
 * @returns {Promise<Array>} Array of file objects with filename, patch, status, etc.
 */
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
 * Post an inline review comment on a specific file in the PR.
 * 
 * The comment will be attached to the first modified line in the file's diff.
 * Returns true if successful, false if the comment couldn't be posted.
 * 
 * @param {Object} params - Comment parameters
 * @param {string} params.body - The comment text (supports markdown)
 * @param {string} params.path - The file path relative to repo root
 * @param {string} params.commit_id - The SHA of the commit to comment on
 * @param {string} params.patch - The git diff patch for this file
 * @returns {Promise<boolean>} True if comment was posted, false otherwise
 */
export async function postInlineComment({
  body,
  path,
  commit_id,
  patch,
}) {
  const line = getSafeLineFromPatch(patch);

  if (!line) {
    return false;
  }

  try {
    await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number,
      body,
      commit_id,
      path,
      line,
      side: "RIGHT",
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Post an inline review comment at a specific line number.
 * 
 * Use this when you know the exact line number where the issue occurs.
 * Falls back to getSafeLineFromPatch if the specified line is invalid.
 * 
 * @param {Object} params - Comment parameters
 * @param {string} params.body - The comment text (supports markdown)
 * @param {string} params.path - The file path relative to repo root
 * @param {string} params.commit_id - The SHA of the commit to comment on
 * @param {number} params.line - The specific line number to comment on
 * @param {string} params.patch - The git diff patch (for validation/fallback)
 * @returns {Promise<boolean>} True if comment was posted, false otherwise
 */
export async function postInlineCommentAtLine({
  body,
  path,
  commit_id,
  line,
  patch,
}) {
  // Validate the line is actually in the diff
  let targetLine = line;
  
  if (!isLineInPatch(patch, line)) {
    targetLine = getSafeLineFromPatch(patch);
    if (!targetLine) {
      return false;
    }
  }

  try {
    await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number,
      body,
      commit_id,
      path,
      line: targetLine,
      side: "RIGHT",
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check if a specific line number exists in the patch (new file side).
 * 
 * @param {string} patch - The git diff patch
 * @param {number} targetLine - The line number to check
 * @returns {boolean} True if the line exists in the patch
 */
function isLineInPatch(patch, targetLine) {
  if (!patch || !targetLine) return false;

  const lines = patch.split("\n");
  let currentLine = null;

  for (const line of lines) {
    // Match hunk header
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = Number(hunk[1]);
      continue;
    }

    if (currentLine !== null) {
      // Check if we've reached the target line
      if (currentLine === targetLine) {
        return true;
      }
      
      // Increment for context and additions
      if (line.startsWith(" ") || line.startsWith("+")) {
        currentLine++;
      }
    }
  }

  return false;
}

/**
 * Post a general comment on the PR (not attached to specific lines).
 * 
 * @param {string} body - The comment text (supports markdown)
 * @returns {Promise<void>}
 */
export async function postReviewComment(body) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body,
  });
}

/**
 * Apply labels to a PR based on AI review results.
 * 
 * Labels help quickly identify the review status:
 * - "ai-critical": High severity issues found (should block merge)
 * - "ai-needs-attention": Medium/low severity issues found
 * - "ai-clean": No issues detected
 * 
 * @param {number} filesWithIssues - Number of files that have review issues (0 if none)
 * @param {boolean} hasHighSeverity - True if any high-severity issues were found
 * @returns {Promise<void>}
 * 
 * @example
 * await applyLabels(3, true); // Adds "ai-critical" label
 * await applyLabels(2, false); // Adds "ai-needs-attention" label
 * await applyLabels(0, false); // Adds "ai-clean" label
 */
export async function applyLabels(filesWithIssues, hasHighSeverity) {
  const labels = hasHighSeverity
    ? ["ai-critical"]
    : filesWithIssues > 0
    ? ["ai-needs-attention"]
    : ["ai-clean"];

  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: pull_number,
    labels,
  });
}
