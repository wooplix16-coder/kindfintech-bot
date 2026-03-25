const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateReply({ message, contextFAQs, history }) {
  const faqContext = contextFAQs.length
    ? contextFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No relevant FAQ found.";

  const historyText = history.join("\n");

  const prompt = `
You are an HR assistant chatbot.

Your job:
- Understand user intent
- Answer using FAQ if relevant
- If partially relevant → adapt answer naturally
- If not found → say politely you are not sure

Conversation History:
${historyText}

FAQ Context:
${faqContext}

User: ${message}

Answer naturally like a human (not robotic).
Keep it short.
`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn’t understand.";

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Error processing request.";
  }
}

module.exports = { generateReply };
