const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { detectIntent } = require("./services/intentService");
const { generateReply } = require("./services/aiService");

const app = express();
app.use(express.json());

const sessions = {};

app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 NEW REQUEST:", JSON.stringify(req.body));

    const message =
      req.body?.message?.text ||
      req.body?.message ||
      "";

    const sessionId = req.body?.session_id || "default";

    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        history: [],
        greeted: false
      };
      console.log("🆕 New session:", sessionId);
    }

    const session = sessions[sessionId];

    console.log("💬 USER MESSAGE:", message);

    // FIRST GREETING
    if (!session.greeted) {
      session.greeted = true;

      console.log("👋 Sending first greeting");

      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hello 👋 I’m Kind Fintech Bot. How can I help you today?"
        }]
      });
    }

    if (!message || message.trim() === "") {
      console.log("⚠️ Empty message");
      return res.json({ action: "reply", replies: [] });
    }

    const intent = detectIntent(message);

    // IDENTITY
    if (intent === "identity") {
      console.log("👤 Identity response");
      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "I’m Kind Fintech Bot 🤖 I help with HR policies."
        }]
      });
    }

    // GREETING
    if (intent === "greeting") {
      console.log("👋 Greeting response");
      return res.json({
        action: "reply",
        replies: [{
          type: "text",
          text: "Hi 👋 How can I help you?"
        }]
      });
    }

    // FAQ SEARCH
    const matchedFAQs = searchFAQ(message);

    console.log("📊 Matched FAQs:", matchedFAQs.length);

    const reply = await generateReply({
      message,
      contextFAQs: matchedFAQs,
      history: session.history,
      intent
    });

    session.history.push(`User: ${message}`);
    session.history.push(`Bot: ${reply}`);

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: reply
      }]
    });

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err);

    return res.json({
      action: "reply",
      replies: [{
        type: "text",
        text: "Critical error occurred."
      }]
    });
  }
});

app.listen(3000, () => console.log("🚀 DEBUG SERVER RUNNING"));
