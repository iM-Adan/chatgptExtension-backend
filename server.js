<<<<<<< HEAD
=======
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

let pdfChunks = []; // { text: "..." }

// Fallback similarity: naive word overlap
function textSimilarity(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(/\W+/));
  const wordsB = new Set(textB.toLowerCase().split(/\W+/));
  const common = [...wordsA].filter(word => wordsB.has(word));
  return common.length;
}

// Load PDFs and chunk into ~1000-char pieces
async function loadPDFs() {
  const folderPath = path.join(__dirname, 'pdfs');
  if (!fs.existsSync(folderPath)) {
    console.warn('⚠️ "pdfs" folder does not exist. Skipping PDF loading.');
    return;
  }

  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.pdf'));

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(folderPath, file));
    const data = await pdfParse(buffer);
    const chunks = data.text.match(/(.|\s){1,1000}/g) || [];
    for (const chunk of chunks) {
      pdfChunks.push({ text: chunk });
    }
  }

  console.log(`✅ Loaded ${pdfChunks.length} chunks from PDFs`);
}

// Ask endpoint
>>>>>>> b48fd381fe361fa0d78d868e8fbaf264509b5d39
app.post('/ask', async (req, res) => {
  const { question } = req.body;

  try {
    // 🟢 Try Gemini FIRST (free)
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(question);
      const response = await result.response;
      const text = response.text();

<<<<<<< HEAD
      return res.json({ reply: text, source: "gemini" });
    } catch (geminiErr) {
      console.log("Gemini failed, falling back...");
    }
=======
    const prompt = ` search and give as short answer as possible, if you have doubt in your answer they just add "BOD" in start of the answer:\n${topChunks}\n\nQ: ${question}\nA:`;
>>>>>>> b48fd381fe361fa0d78d868e8fbaf264509b5d39

    // 🔵 Fallback → OpenRouter
    const completion = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: question }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const answer = completion.data.choices[0].message.content.trim();

    res.json({ reply: answer, source: "openrouter" });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Both APIs failed" });
  }
});