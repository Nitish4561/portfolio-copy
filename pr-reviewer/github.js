import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const pull_number = Number(process.env.PR_NUMBER);

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
 * Extract the first valid line number from a git diff patch.
 * 
 * GitHub requires inline PR comments to reference actual lines that exist in the diff.
 * This function parses the patch to find the first added or modified line.
 * 
 * @param {string} patch - The git diff patch string from GitHub API
 * @returns {number|null} The line number to comment on, or null if patch is invalid
 * 
 * @example
 * // Given a patch like:
 * // @@ -10,3 +10,5 @@ export function Component() {
 * //    return <div>
 * // +    <span>New content</span>
 * //      <button>Click</button>
 * // Returns: 11 (the line with the addition)
 * 
 * @example
 * // Patch with only context lines:
 * // @@ -5,2 +5,2 @@
 * //    const x = 1;
 * //    const y = 2;
 * // Returns: 5 (first line of the hunk)
 */
function getFirstLineFromPatch(patch) {
  if (!patch) return null;
  
  const lines = patch.split('\n');
  let currentLine = null;
  
  for (const line of lines) {
    // Match hunk header format: @@ -oldStart,oldLines +newStart,newLines @@
    // Example: @@ -10,3 +15,4 @@ means new content starts at line 15
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    
    if (hunkMatch) {
      // Found a new hunk - extract the starting line number for new content
      currentLine = parseInt(hunkMatch[1], 10);
      continue;
    }
    
    // Only process lines after we've found a hunk header
    if (currentLine !== null) {
      // Lines starting with '+' (but not '+++' file markers) are additions
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return currentLine; // Return line number of first addition
      }
      
      // Lines starting with ' ' (space) are context lines - they increment the line number
      // Lines starting with '+' also increment (but we already returned above)
      // Lines starting with '-' are deletions - they don't affect new file line numbers
      if (line.startsWith(' ') || line.startsWith('+')) {
        currentLine++;
      }
    }
  }
  
  // No additions found - return the first line of the first hunk as fallback
  const firstHunk = patch.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/m);
  return firstHunk ? parseInt(firstHunk[1], 10) : null;
}

/**
 * Post an inline review comment on a specific file in the PR.
 * 
 * The comment will be attached to the first modified line in the file's diff.
 * If no valid line can be found, the comment is skipped with a warning.
 * 
 * @param {Object} params - Comment parameters
 * @param {string} params.body - The comment text (supports markdown)
 * @param {string} params.path - The file path relative to repo root
 * @param {string} params.commit_id - The SHA of the commit to comment on
 * @param {string} params.patch - The git diff patch for this file
 * @returns {Promise<void>}
 */
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
 * // PR with critical issues
 * await applyLabels(3, true); // Adds "ai-critical" label
 * 
 * @example
 * // PR with minor issues
 * await applyLabels(2, false); // Adds "ai-needs-attention" label
 * 
 * @example
 * // Clean PR
 * await applyLabels(0, false); // Adds "ai-clean" label
 */
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
