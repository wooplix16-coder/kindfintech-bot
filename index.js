const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { detectIntent } = require("./services/intentService");
const { generateReply } = require("./services/aiService");

const app = express();
app.use(express.json());

const sessions = {};

app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    const message =
      req.body?.message?.text ||
      req.body?.message ||
      "";

    const sessionId = req.body?.session_id || "default";

    // 🧠 INIT SESSION
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        history: [],
        greeted: false,
        failureCount: 0
      };
    }

    const session = sessions[sessionId];

    console.log("📩", message);

    // ✅ FIRST GREETING
    if (!session.greeted) {
      session.greeted = true;

      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hello 👋 Welcome! I can help you with HR topics like leave, salary, and policies.\n\nHow can I assist you today?"
        }]
      });
    }

    // ✅ EMPTY MESSAGE
    if (!message || message.trim() === "") {
      return res.json({ action: "reply", replies: [] });
    }

    const intent = detectIntent(message);

    // ✅ GREETING AFTER FIRST
    if (intent === "greeting") {
      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hi 👋 What can I help you with?"
        }]
      });
    }

    // 🔍 FAQ MATCH
    const matchedFAQs = searchFAQ(message);

    // 🚫 NO MATCH → FALLBACK
    if (matchedFAQs.length === 0) {
      session.failureCount++;

      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "I’m not fully sure about that 🤔 but I can help with HR topics like leave, salary, and working hours."
        }]
      });
    }

    // 🤖 AI RESPONSE
    const reply = await generateReply({
      message,
      contextFAQs: matchedFAQs,
      history: session.history
    });

    session.history.push(`User: ${message}`);
    session.history.push(`Bot: ${reply}`);

    if (session.history.length > 10) {
      session.history.shift();
    }

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: reply
      }]
    });

  } catch (err) {
    console.error(err);

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: "Something went wrong. Please try again."
      }]
    });
  }
});

app.listen(3000, () => console.log("🚀 Server running"));
