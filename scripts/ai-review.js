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
      messages: [
        {
          role: "system",
          content: "You are a senior WordPress engineer performing a PR review. Be concise and practical."
        },
        {
          role: "user",
          content: `Review this PR diff:\n\n${diff}`
        }
      ],
      temperature: 0.2
    })
  });

  const data = await response.json();
  const review = data.choices?.[0]?.message?.content || "No review generated.";

  fs.writeFileSync("review.txt", review);
}

main();