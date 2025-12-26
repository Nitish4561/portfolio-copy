import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const pull_number = Number(process.env.PR_NUMBER);

/* -------------------- PATCH HELPERS -------------------- */

function getSafeLineFromPatch(patch) {
  if (!patch) return null;

  const lines = patch.split("\n");
  let currentLine = null;

  for (const line of lines) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = Number(hunk[1]);
      continue;
    }

    if (currentLine !== null) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return currentLine;
      }

      if (line.startsWith(" ") || line.startsWith("+")) {
        currentLine++;
      }
    }
  }

  return currentLine;
}

function isLineInPatch(patch, targetLine) {
  if (!patch || !targetLine) return false;

  const lines = patch.split("\n");
  let currentLine = null;

  for (const line of lines) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = Number(hunk[1]);
      continue;
    }

    if (currentLine !== null) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        if (currentLine === targetLine) return true;
        currentLine++;
      } else if (line.startsWith(" ")) {
        if (currentLine === targetLine) return true;
        currentLine++;
      }
    }
  }

  return false;
}

/* -------------------- GITHUB API -------------------- */

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

export async function postInlineComment({
  body,
  path,
  commit_id,
  patch,
}) {
  const line = getSafeLineFromPatch(patch);
  if (!line) return false;

  try {
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
    return true;
  } catch {
    console.error("Failed to post inline comment:", err);
    return false;
  }
}

export async function postInlineCommentAtLine({
  body,
  path,
  commit_id,
  line,
  patch,
}) {
  let target = line;

  if (!isLineInPatch(patch, line)) {
    target = getSafeLineFromPatch(patch);
    if (!target) return false;
  }

  try {
    await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number,
      body,
      path,
      commit_id,
      line: target,
      side: "RIGHT",
    });
    return true;
  } catch {
    console.error("Failed to post inline comment at line:", err);
    return false;
  }
}

export async function postReviewComment(body) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body,
  });
}

export async function updatePRDescription(body) {
  await octokit.rest.pulls.update({
    owner,
    repo,
    pull_number,
    body,
  });
}

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
