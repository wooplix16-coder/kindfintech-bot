const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { detectIntent } = require("./services/intentService");
const { generateReply } = require("./services/aiService");

const app = express();
app.use(express.json());

const sessions = {};

app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━");

    const message =
      req.body?.message?.text ||
      req.body?.message ||
      "";

    const sessionId = req.body?.session_id || "default";

    if (!sessions[sessionId]) {
      sessions[sessionId] = { greeted: false };
    }

    const session = sessions[sessionId];

    console.log("💬 USER:", message);

    // ✅ ALWAYS FIRST GREETING
    if (!session.greeted) {
      session.greeted = true;

      console.log("👋 FIRST GREETING");

      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hello 👋 I’m Kind Fintech Bot.\nHow can I help you today?"
        }]
      });
    }

    if (!message || message.trim() === "") {
      return res.json({ action: "reply", replies: [] });
    }

    const intent = detectIntent(message);

    console.log("🧠 INTENT:", intent);

    // ✅ IDENTITY
    if (intent === "identity") {
      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "I’m Kind Fintech Bot 🤖 I help with HR policies and queries."
        }]
      });
    }

    // ✅ GREETING
    if (intent === "greeting") {
      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hi 👋 How can I help you?"
        }]
      });
    }

    const matchedFAQs = searchFAQ(message);

    const reply = await generateReply({
      message,
      contextFAQs: matchedFAQs,
      intent
    });

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: reply
      }]
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: "Something went wrong."
      }]
    });
  }
});

app.listen(3000, () => console.log("🚀 Server running"));
