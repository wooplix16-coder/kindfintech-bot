const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateReply({ message, contextFAQs, history, intent }) {

  // 🚫 HARD FALLBACK (no FAQ for policy)
  if (intent === "policy" && contextFAQs.length === 0) {
    return "I’m not fully sure about that 🤔 but I can help with HR topics like leave, salary, and working hours.";
  }

  const faqContext = contextFAQs.length
    ? contextFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No FAQ available";

  const historyText = history.join("\n");

  const prompt = `
You are a smart HR assistant chatbot.

Understand the user's intent carefully.

INTENT TYPES:

1. Greeting → respond warmly
2. Identity → introduce yourself as Kind Fintech Bot
3. Capability → explain what you can do
4. Definition → explain concept clearly (e.g., "What is sick leave?")
5. Policy → give exact company rule from FAQ
6. Unknown → politely guide to HR topics

IMPORTANT RULES:

- Definition ≠ Policy (DO NOT confuse)
- "What is X" = explanation
- "How many / policy" = exact rule
- Use FAQ only for company-specific answers
- Keep answers short (2–4 lines)
- Do NOT hallucinate

FAQ Context:
${faqContext}

Conversation History:
${historyText}

User Intent: ${intent}
User Message: ${message}

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
      || "Sorry, I couldn’t understand that.";

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "I’m having trouble responding right now. Please try again.";
  }
}

module.exports = { generateReply };
