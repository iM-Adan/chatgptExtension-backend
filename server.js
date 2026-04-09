app.post('/ask', async (req, res) => {
  const { question } = req.body;

  try {
    // 🟢 Try Gemini FIRST (free)
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(question);
      const response = await result.response;
      const text = response.text();

      return res.json({ reply: text, source: "gemini" });
    } catch (geminiErr) {
      console.log("Gemini failed, falling back...");
    }

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