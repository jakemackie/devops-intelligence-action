// devops-intelligence-action/scripts/generate-tests.js
// Script to generate PHPUnit tests for changed PHP files using OpenAI

const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

// Read OpenAI API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const DIFF_PATH = path.resolve(__dirname, '../pr.diff');
const OUTPUT_DIR = path.resolve(__dirname, '../../tests/Generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'AIGeneratedTest.php');

async function main() {
  if (!fs.existsSync(DIFF_PATH)) {
    console.error('pr.diff not found.');
    process.exit(1);
  }
  const diff = fs.readFileSync(DIFF_PATH, 'utf8');

  // Prompt for OpenAI
  const prompt = `You are an expert PHP developer. Given the following git diff, generate PHPUnit tests for all changed PHP code. Output only the test class code.\n\nDIFF:\n${diff}`;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that writes PHPUnit tests.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });
    const testCode = response.data.choices[0].message.content.trim();

    // Ensure output directory exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, testCode, 'utf8');
    console.log(`Generated tests written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Error generating tests:', err.message);
    process.exit(1);
  }
}

main();
