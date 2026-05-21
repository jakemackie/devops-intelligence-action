import fs from "fs";

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

async function clickupRequest(path, method, token, body) {
  const response = await fetch(`${CLICKUP_API_URL}${path}`, {
    method,
    headers: {
      Authorization: token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ClickUp ${method} ${path} failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

async function githubRequest(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GitHub GET ${path} failed: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  return response.json();
}

async function fetchAllReviewComments(repo, prNumber, token) {
  const comments = [];
  let page = 1;

  while (page <= 10) {
    const batch = await githubRequest(
      `/repos/${repo}/pulls/${prNumber}/comments?per_page=100&page=${page}`,
      token,
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    comments.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return comments;
}

async function listTasks(listId, token) {
  const response = await clickupRequest(
    `/list/${listId}/task?subtasks=true&include_closed=true&page=0`,
    "GET",
    token,
  );

  return Array.isArray(response.tasks) ? response.tasks : [];
}

function parseIssues(reviewText) {
  const sections = reviewText.split(/\n(?=### Issue \d+)/g);

  return sections
    .filter((section) => section.startsWith("### Issue"))
    .map((section) => {
      const severity = (section.match(/Severity:\s*\*\*(.+?)\*\*/) || [])[1] || "unknown";
      const file = (section.match(/File:\s*`(.+?)`/) || [])[1] || "unknown";
      const line = (section.match(/Line:\s*(.+)/) || [])[1] || "n/a";
      const problem = (section.match(/Problem:\s*(.+)/) || [])[1] || "No problem text";
      const suggestion = (section.match(/Suggestion:\s*(.+)/) || [])[1] || "No suggestion text";

      return { severity, file, line, problem, suggestion };
    });
}

async function main() {
  const token = requiredEnv("CLICKUP_API_TOKEN");
  const listId = requiredEnv("CLICKUP_LIST_ID");
  const repo = process.env.GITHUB_REPOSITORY || "unknown/repo";
  const prNumber = process.env.PR_NUMBER || "unknown";
  const prTitle = process.env.PR_TITLE || "Pull Request";
  const prUrl = process.env.PR_URL || "";
  const githubToken = process.env.GITHUB_TOKEN;

  const review = fs.existsSync("review.txt") ? fs.readFileSync("review.txt", "utf8") : "No AI review produced.";
  const issues = parseIssues(review).slice(0, 20);
  const prKey = `PR_KEY:${repo}#${prNumber}`;

  const tasks = await listTasks(listId, token);

  const existingParent = tasks.find(
    (task) =>
      (typeof task.name === "string" && task.name.startsWith(`[PR #${prNumber}]`)) ||
      (typeof task.description === "string" && task.description.includes(prKey)),
  );

  let parentTask;

  if (existingParent) {
    parentTask = await clickupRequest(`/task/${existingParent.id}`, "PUT", token, {
      name: `[PR #${prNumber}] ${prTitle}`,
      description: `Repository: ${repo}\nPR URL: ${prUrl}\n${prKey}\n\nAI Review Summary:\n${review.slice(0, 2000)}`,
      tags: ["github-pr", "ai-review"],
    });
  } else {
    parentTask = await clickupRequest(`/list/${listId}/task`, "POST", token, {
      name: `[PR #${prNumber}] ${prTitle}`,
      description: `Repository: ${repo}\nPR URL: ${prUrl}\n${prKey}\n\nAI Review Summary:\n${review.slice(0, 2000)}`,
      tags: ["github-pr", "ai-review"],
    });
  }

  const refreshedTasks = await listTasks(listId, token);
  const existingSubtasks = refreshedTasks.filter((task) => task.parent === parentTask.id);
  let createdSubtasks = 0;
  let updatedSubtasks = 0;
  let skippedSubtasks = 0;
  let createdReviewCommentSubtasks = 0;
  let updatedReviewCommentSubtasks = 0;

  for (const issue of issues) {
    const issueKey = `ISSUE_KEY:${issue.severity}|${issue.file}|${issue.line}|${issue.problem.slice(0, 80)}`;

    const matchingSubtask = existingSubtasks.find(
      (task) => typeof task.description === "string" && task.description.includes(issueKey),
    );

    if (matchingSubtask) {
      await clickupRequest(`/task/${matchingSubtask.id}`, "PUT", token, {
        name: `[${issue.severity}] ${issue.file}`,
        description: `${issueKey}\nLine: ${issue.line}\nProblem: ${issue.problem}\nSuggestion: ${issue.suggestion}`,
        tags: ["review-comment", "subtask"],
      });
      updatedSubtasks += 1;
      continue;
    }

    await clickupRequest(`/list/${listId}/task`, "POST", token, {
      name: `[${issue.severity}] ${issue.file}`,
      description: `${issueKey}\nLine: ${issue.line}\nProblem: ${issue.problem}\nSuggestion: ${issue.suggestion}`,
      parent: parentTask.id,
      tags: ["review-comment", "subtask"],
    });
    createdSubtasks += 1;
  }

  if (githubToken) {
    const reviewComments = await fetchAllReviewComments(repo, prNumber, githubToken);

    for (const comment of reviewComments) {
      const issueKey = `GH_REVIEW_COMMENT_ID:${comment.id}`;
      const path = comment.path || "unknown-file";
      const line = comment.line ?? comment.original_line ?? "n/a";
      const author = comment.user?.login || "unknown-user";
      const body = (comment.body || "").slice(0, 1200);
      const htmlUrl = comment.html_url || "";

      const matchingSubtask = existingSubtasks.find(
        (task) => typeof task.description === "string" && task.description.includes(issueKey),
      );

      const description = [
        issueKey,
        `Source: GitHub Review Comment`,
        `Author: ${author}`,
        `File: ${path}`,
        `Line: ${line}`,
        `URL: ${htmlUrl}`,
        "",
        "Comment:",
        body,
      ].join("\n");

      if (matchingSubtask) {
        await clickupRequest(`/task/${matchingSubtask.id}`, "PUT", token, {
          name: `[review-comment] ${path}:${line}`,
          description,
          tags: ["github-review-comment", "subtask"],
        });
        updatedReviewCommentSubtasks += 1;
      } else {
        await clickupRequest(`/list/${listId}/task`, "POST", token, {
          name: `[review-comment] ${path}:${line}`,
          description,
          parent: parentTask.id,
          tags: ["github-review-comment", "subtask"],
        });
        createdReviewCommentSubtasks += 1;
      }
    }
  }

  skippedSubtasks = Math.max(0, existingSubtasks.length - updatedSubtasks);

  const result = [
    "ClickUp sync completed.",
    `Parent task mode: ${existingParent ? "updated" : "created"}`,
    `Parent task: ${parentTask.id}`,
    `Subtasks created: ${createdSubtasks}`,
    `Subtasks updated: ${updatedSubtasks}`,
    `Review-comment subtasks created: ${createdReviewCommentSubtasks}`,
    `Review-comment subtasks updated: ${updatedReviewCommentSubtasks}`,
    `Existing subtasks not touched: ${skippedSubtasks}`,
  ].join("\n");

  fs.writeFileSync("clickup-sync.txt", result, "utf8");
  fs.writeFileSync(
    "clickup-sync.json",
    JSON.stringify(
      {
        ok: true,
        parentTaskId: parentTask.id,
        parentMode: existingParent ? "updated" : "created",
        createdSubtasks,
        updatedSubtasks,
        createdReviewCommentSubtasks,
        updatedReviewCommentSubtasks,
        skippedSubtasks,
      },
      null,
      2,
    ),
    "utf8",
  );
}

main().catch((error) => {
  fs.writeFileSync("clickup-sync.txt", `ClickUp sync failed.\n${error.message}`, "utf8");
  fs.writeFileSync(
    "clickup-sync.json",
    JSON.stringify({ ok: false, error: error.message }, null, 2),
    "utf8",
  );
  process.exit(1);
});
