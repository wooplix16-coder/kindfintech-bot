console.log("🚀 BOT SERVER STARTED");

const express = require("express");
const axios = require("axios");
const { searchFAQ } = require("./services/faqService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// 🧠 Session store (replace with Redis later)
const sessions = {};

// ─────────────────────────────────────────
// 👋 Greeting detection
// ─────────────────────────────────────────
function isGreeting(message) {
  const greetings = [
    "hi", "hello", "hey",
    "good morning", "good afternoon", "good evening"
  ];

  return greetings.some(g =>
    message.toLowerCase().includes(g)
  );
}

// ─────────────────────────────────────────
// 🤖 Gemini call
// ─────────────────────────────────────────
async function callGemini(message) {
  if (!GEMINI_API_KEY) {
    return "AI not configured.";
  }

  const matchedFAQs = searchFAQ(message);

  const context = matchedFAQs.length
    ? matchedFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No relevant FAQ found.";

  const prompt = `
You are an HR chatbot.

Rules:
1. If greeting → respond politely
2. Answer ONLY from FAQ
3. If not found → say you are not sure and suggest contacting HR

FAQ:
${context}

User: ${message}
Answer:
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn’t understand.";

  } catch (err) {
    console.error("❌ Gemini Error:", err.message);
    return "Error processing request.";
  }
}

// ─────────────────────────────────────────
// 🌐 Webhook
// ─────────────────────────────────────────
app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    const message =
      req.body?.message?.text ||
      req.body?.message ||
      "";

    const sessionId = req.body?.session_id || "default";

    if (!sessions[sessionId]) {
      sessions[sessionId] = { isFirstMessage: true };
    }

    const session = sessions[sessionId];

    console.log("📩", message);

    // ✅ First message logic
    if (session.isFirstMessage) {
      session.isFirstMessage = false;

      if (isGreeting(message)) {
        return res.json({
          action: "reply",
          replies: [{
            type: "text",
            text: "Hello 👋 How can I help you today?"
          }]
        });
      }
    }

    // ✅ Greeting anytime
    if (isGreeting(message)) {
      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hi 👋 What can I do for you?"
        }]
      });
    }

    // ✅ AI response
    const reply = await callGemini(message);

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: reply
      }]
    });

  } catch (error) {
    console.error("🔥 ERROR:", error.message);

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: "Something went wrong. Connecting to human agent."
      }]
    });
  }
});

// ─────────────────────────────────────────
// Health
// ─────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Running on ${PORT}`);
});
