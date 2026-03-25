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

    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        history: [],
        isFirst: true
      };
    }

    const session = sessions[sessionId];

    // 🧠 Save history
    session.history.push(`User: ${message}`);
    if (session.history.length > 10) session.history.shift();

    // ─── INTENT DETECTION ─────────────────────
    const intent = detectIntent(message);

    // ─── GREETING ─────────────────────────────
    if (intent === "greeting" && session.isFirst) {
      session.isFirst = false;

      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hello 👋 How can I help you today?"
        }]
      });
    }

    // ─── FAQ SEARCH ───────────────────────────
    const matchedFAQs = searchFAQ(message);

    // ─── AI RESPONSE ──────────────────────────
    const reply = await generateReply({
      message,
      contextFAQs: matchedFAQs,
      history: session.history
    });

    session.history.push(`Bot: ${reply}`);

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
        text: "Something went wrong. Connecting to human."
      }]
    });
  }
});

app.listen(3000, () => console.log("🚀 Running"));
