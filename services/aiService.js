const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateAIReply({ message, memory, history }) {

  const prompt = `
You are an intelligent HR assistant.

You have structured memory about the user.

Memory:
${JSON.stringify(memory)}

Conversation:
${history.join("\n")}

User: ${message}

Instructions:
- Use memory to answer logically
- Perform calculations when needed
- Example:
  total = 10, used = 3 → remaining = 7
- Do NOT assume missing values
- Be concise and natural
- Avoid repetition

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
      || "I couldn’t process that.";

  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    return "I’m having trouble responding right now.";
  }
}

module.exports = { generateAIReply };
