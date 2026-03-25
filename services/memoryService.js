const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function extractFactsAI(message, currentMemory) {

  const prompt = `
Extract structured information from the user message.

Return ONLY JSON.

Current Memory:
${JSON.stringify(currentMemory)}

User Message:
${message}

Rules:
- Extract name if mentioned
- Extract numbers and what they refer to
- Detect context (leave, hours, tasks, etc.)
- Detect usage (used, taken, completed)
- Do NOT guess missing data

Return format:
{
  "name": "",
  "topic": "",
  "value": 0,
  "type": ""
}
`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const text =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return JSON.parse(text);
  } catch (err) {
    console.error("FACT EXTRACTION ERROR:", err.message);
    return {};
  }
}

module.exports = { extractFactsAI };
