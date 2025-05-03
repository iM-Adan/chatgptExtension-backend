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
app.post('/ask', async (req, res) => {
  const { question } = req.body;

  try {
    // Fake similarity using word overlap
    const ranked = pdfChunks
      .map(chunk => ({
        ...chunk,
        similarity: textSimilarity(question, chunk.text),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const topChunks = ranked.slice(0, 3).map(c => c.text).join('\n');

    const prompt = ` search and give as short answer as possible, if you have doubt in your answer they just add "BOD" in start of the answer:\n${topChunks}\n\nQ: ${question}\nA:`;

    const completion = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // or other OpenRouter-supported model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:5000',
          'Content-Type': 'application/json',
        },
      }
    );

    const answer = completion.data.choices[0].message.content.trim();
    res.json({ reply: answer });
  } catch (err) {
    console.error('Error querying OpenRouter:', err.response?.data || err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await loadPDFs();
});
