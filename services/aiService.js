const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateReply({ message, contextFAQs, history, intent }) {

  // 🔴 HARD FAIL CHECK
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing");
    return "AI is not configured properly. Please contact admin.";
  }

  // 🚫 Prevent hallucination
  if (intent === "policy" && contextFAQs.length === 0) {
    return "I’m not fully sure about that 🤔 but I can help with HR topics like leave, salary, and working hours.";
  }

  const faqContext = contextFAQs.length
    ? contextFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No FAQ available";

  const historyText = history.join("\n");

  const prompt = `
You are a smart HR assistant chatbot.

Understand intent:

- Greeting → greet
- Identity → say you are Kind Fintech Bot
- Capability → explain help
- Definition → explain concept
- Policy → use FAQ
- Unknown → guide back to HR

RULES:
- Do NOT hallucinate
- Keep short
- Be natural

FAQ:
${faqContext}

History:
${historyText}

Intent: ${intent}
User: ${message}

Answer:
`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("✅ Gemini success");

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn’t understand that.";

  } catch (err) {
    console.error("❌ GEMINI ERROR FULL:", err.response?.data || err.message);

    return "I’m having trouble responding right now. Please try again.";
  }
}

module.exports = { generateReply };
