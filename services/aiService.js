const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateAIReply({ message, memory, history, faqContext }) {

  const prompt = `
You are a smart HR assistant.

You must:
- understand context
- use memory
- reason dynamically
- calculate values if needed

Memory:
${JSON.stringify(memory)}

Conversation:
${history.join("\n")}

FAQ (for reference only):
${faqContext}

User: ${message}

Rules:
- Use memory for calculations
- If user gave values → use them
- If total exists → calculate remaining
- If missing data → say you don't know
- Be natural
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
      || "I couldn’t understand that.";

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "I’m having trouble responding right now.";
  }
}

module.exports = { generateAIReply };
