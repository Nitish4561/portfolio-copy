import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const pull_number = Number(process.env.PR_NUMBER);

export async function getPullRequest() {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number
  });
  return data;
}

export async function getPullRequestDiff() {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const pull_number = Number(process.env.GITHUB_PR_NUMBER);

  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number,
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
    }
  );

  return response.data;
}

export async function postReviewComment(body) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body
  });
}

export async function postFileComment({ path, body }) {
  await octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
    {
      owner,
      repo,
      pull_number,
      body,
      path,
      side: "RIGHT",
      line: 1
    }
  );
}

export async function applyLabels(review) {
  let labels = [];

  if (review.summary?.toLowerCase().includes("failed")) {
    labels.push("ai-failed");
  } else if (review.issues.length === 0) {
    labels.push("ai-clean");
  } else {
    labels.push("ai-needs-attention");
  }

  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: pull_number,
    labels
  });
}
