const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateReply({ message, contextFAQs, history }) {

  // 🚫 HARD FALLBACK (no FAQ → no AI hallucination)
  if (!contextFAQs.length) {
    return "I’m not fully sure about that 🤔 but I can help with HR topics like leave, salary, and working hours.";
  }

  const faqContext = contextFAQs
    .map(f => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const historyText = history.join("\n");

  const prompt = `
You are a smart and professional HR assistant chatbot.

Follow this priority strictly:

STEP 1: If greeting → respond warmly
STEP 2: If HR-related → answer using FAQ context naturally
STEP 3: If partial → combine FAQ + understanding
STEP 4: If not HR → politely redirect to HR topics

STRICT RULES:
- Do NOT make up policies
- Keep answers short (2–4 lines)
- Be natural and human-like

FAQ Context:
${faqContext}

Conversation History:
${historyText}

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
      || "Sorry, I couldn’t understand that properly.";

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "I’m having trouble responding right now. Please try again.";
  }
}

module.exports = { generateReply };
