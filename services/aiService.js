const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateAIReply({ message, history, name }) {

  const prompt = `
You are Kind Fintech HR Assistant.

Rules:
- Be natural, not robotic
- Do NOT repeat greetings unnecessarily
- If name exists, use it naturally
- Keep answers short (2-3 lines)
- For HR topics → general guidance only
- Do NOT assume personal data

User Name: ${name || "Unknown"}

Conversation:
${history.join("\n")}

User: ${message}

Answer:
`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I couldn't understand that.";

  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    return "I’m having trouble responding right now.";
  }
}

module.exports = { generateAIReply };
