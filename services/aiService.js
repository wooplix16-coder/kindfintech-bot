const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateReply({ message, contextFAQs, intent }) {

  console.log("🤖 AI CALLED | Intent:", intent);

  if (!GEMINI_API_KEY) {
    console.error("❌ Missing API Key");
    return "AI not configured.";
  }

  // 🚫 prevent bad answers
  if (intent === "policy" && contextFAQs.length === 0) {
    return "I’m not sure about that 🤔 but I can help with HR topics like leave, salary, and working hours.";
  }

  const faqContext = contextFAQs.length
    ? contextFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No FAQ";

  const prompt = `
You are Kind Fintech HR Bot.

Behavior:
- Greeting → greet properly
- Identity → introduce yourself
- Definition → explain concept
- Policy → answer from FAQ
- Unknown → guide to HR topics

Rules:
- Keep answers short
- Be human-like
- No hallucination

FAQ:
${faqContext}

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

    const reply =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("✅ AI RESPONSE:", reply);

    return reply || "Sorry, I couldn’t understand.";

  } catch (err) {
    console.error("❌ GEMINI ERROR:", err.response?.data || err.message);
    return "I’m having trouble responding right now.";
  }
}

module.exports = { generateReply };
