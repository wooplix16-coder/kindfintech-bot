const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { detectIntent } = require("./services/intentService");
const { generateReply } = require("./services/aiService");

const app = express();
app.use(express.json());

const sessions = {};

app.post("/api/salesiq/webhook", async (req, res) => {
  let replyText = "Something went wrong.";

  try {
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

    // ✅ FIRST GREETING
    if (!session.greeted) {
      session.greeted = true;
      replyText = "Hello 👋 I’m Kind Fintech Bot. How can I help you today?";
    }

    else if (!message || message.trim() === "") {
      replyText = "";
    }

    else {
      const intent = detectIntent(message);

      console.log("🧠 INTENT:", intent);

      if (intent === "identity") {
        replyText = "I’m Kind Fintech Bot 🤖 I help with HR queries.";
      }

      else if (intent === "greeting") {
        replyText = "Hi 👋 How can I help you?";
      }

      else {
        const matchedFAQs = searchFAQ(message);

        replyText = await generateReply({
          message,
          contextFAQs: matchedFAQs,
          intent
        });
      }
    }

  } catch (err) {
    console.error("🔥 ERROR:", err);
    replyText = "System error occurred.";
  }

  // ✅ ALWAYS RETURN RESPONSE
  return res.json({
    action: "reply",
    replies: replyText
      ? [{ type: "text", text: replyText }]
      : []
  });
});

app.listen(3000, () => console.log("🚀 Server running"));
