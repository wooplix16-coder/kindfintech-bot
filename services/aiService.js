const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateAIReply({ message, history, name, memory }) {

  const prompt = `
You are Kind Fintech HR Assistant.

User Name: ${name || "Unknown"}

Memory:
${JSON.stringify(memory)}

Conversation:
${history.join("\n")}

User: ${message}

Rules:
- Use memory to answer logically
- Perform calculations when needed
- Example:
  total = 10, used = 3 → remaining = 7
- NEVER assume unknown values
- Keep answers short and natural
- Avoid repeating phrases

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
      || "I couldn’t understand that.";

  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    return "I’m having trouble responding right now.";
  }
}

module.exports = { generateAIReply };
