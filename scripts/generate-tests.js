// devops-intelligence-action/scripts/generate-tests.js
// Script to generate PHPUnit tests for changed PHP files using OpenAI

import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const DIFF_PATH = path.resolve(process.cwd(), 'pr.diff');
const OUTPUT_DIR = path.resolve(__dirname, '../../tests/Generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'AIGeneratedTest.php');

async function main() {
  if (!fs.existsSync(DIFF_PATH)) {
    console.error('pr.diff not found.');
    process.exit(1);
  }
  const diff = fs.readFileSync(DIFF_PATH, 'utf8');

  const prompt = `You are an expert PHP developer. Given the following git diff, generate PHPUnit tests for all changed PHP code. Output only the test class code, and name the class AIGeneratedTest.\n\nDIFF:\n${diff}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that writes PHPUnit tests.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });
    let testCode = response.choices[0].message.content.trim();
    testCode = testCode.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    const phpStart = testCode.indexOf('<?php');
    if (phpStart !== -1) {
      testCode = testCode.substring(phpStart);
    }
    const lastBrace = testCode.lastIndexOf('}');
    if (lastBrace !== -1) {
      testCode = testCode.substring(0, lastBrace + 1);
    }
    // Prepend require_once for index.php after <?php
    const requireLine = "require_once __DIR__ . '/../../index.php';\n";
    if (testCode.startsWith('<?php')) {
      // Insert require after opening tag
      testCode = testCode.replace('<?php', `<?php\n${requireLine}`);
    } else {
      // If for some reason the AI omits the tag, add both
      testCode = `<?php\n${requireLine}${testCode}`;
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, testCode, 'utf8');
    console.log(`Generated tests written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Error generating tests:', err.message);
    process.exit(1);
  }
}

main();
