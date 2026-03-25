const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateReply({ message, contextFAQs, history, intent }) {

  console.log("🤖 AI CALLED");
  console.log("➡️ Intent:", intent);
  console.log("➡️ FAQs:", contextFAQs.length);

  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY MISSING");
    return "AI is not configured properly.";
  }

  if (intent === "policy" && contextFAQs.length === 0) {
    console.log("⚠️ No FAQ → safe fallback");
    return "I’m not fully sure about that 🤔 but I can help with HR topics.";
  }

  const faqContext = contextFAQs.length
    ? contextFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No FAQ";

  const prompt = `
You are a smart HR assistant chatbot.

Intent: ${intent}

Rules:
- Definition → explain
- Policy → use FAQ
- Identity → introduce yourself
- Keep short

FAQ:
${faqContext}

User: ${message}

Answer:
`;

  try {
    console.log("📡 Calling Gemini...");

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const reply =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("✅ Gemini Response:", reply);

    return reply || "No response from AI.";

  } catch (err) {
    console.error("❌ GEMINI ERROR:", err.response?.data || err.message);

    return "I’m having trouble responding right now.";
  }
}

module.exports = { generateReply };
