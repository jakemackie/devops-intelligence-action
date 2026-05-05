import fs from "fs";
import fetch from "node-fetch";

async function main() {
  const diff = fs.readFileSync("pr.diff", "utf8");

  if (!diff.trim()) {
    fs.writeFileSync("review.txt", "No code changes detected.");
    return;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are a senior WordPress engineer reviewing a pull request.

Return ONLY valid JSON in this exact format:

{
  "summary": "short summary",
  "issues": [
    {
      "severity": "high | medium | low",
      "file": "file path",
      "line": "line number or null",
      "issue": "what is wrong",
      "suggestion": "how to fix"
    }
  ]
}

If there are no issues, return:
{
  "summary": "No issues found",
  "issues": []
}
`
        },
        {
          role: "user",
          content: `Review this PR diff:\n\n${diff}`
        }
      ]
    })
  });

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      summary: "AI returned invalid JSON",
      issues: []
    };
  }

  let output = `## 🤖 AI Code Review\n\n`;
  output += `**Summary:** ${parsed.summary}\n\n`;

  if (!parsed.issues.length) {
    output += "No issues found 🎉";
  } else {
    parsed.issues.forEach((issue, i) => {
      output += `### Issue ${i + 1}\n`;
      output += `Severity: **${issue.severity}**\n`;
      output += `File: \`${issue.file}\`\n`;
      output += `Line: ${issue.line}\n`;
      output += `Problem: ${issue.issue}\n`;
      output += `Suggestion: ${issue.suggestion}\n\n`;
    });
  }

  fs.writeFileSync("review.txt", output);
}

main();