import fs from "fs";

const diff = fs.readFileSync("pr.diff", "utf8");

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: "gpt-4.1-mini",
    input: `Review this PHP pull request diff. List code quality issues and improvements:\n\n${diff}`
  })
});

const data = await response.json();
const review = data.output[0].content[0].text;

fs.writeFileSync("review.txt", review);