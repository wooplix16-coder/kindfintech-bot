console.log("🚀 DEBUG MODE SERVER STARTED");

const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { detectIntent } = require("./services/intentService");
const { generateReply } = require("./services/aiService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================
// 🔍 EXTRACT MESSAGE (ROBUST)
// =====================
function extractMessage(body) {
  return (
    body?.message?.text ||
    body?.data?.message ||
    body?.message ||
    body?.text ||
    body?.input ||
    ""
  );
}

// =====================
// 🔍 EXTRACT SESSION ID
// =====================
function extractSessionId(body) {
  return (
    body?.visitor?.id ||
    body?.chat?.id ||
    body?.session_id ||
    "default"
  );
}

// =====================
// 🧠 SESSION MEMORY
// =====================
const sessions = {};

// =====================
// 🚀 WEBHOOK
// =====================
app.post("/api/salesiq/webhook", async (req, res) => {

  console.log("\n================ NEW REQUEST ================");
  console.log("🔥 FULL BODY:\n", JSON.stringify(req.body, null, 2));

  let replyText = "Something went wrong.";

  try {
    const message = extractMessage(req.body);
    const sessionId = extractSessionId(req.body);

    console.log("🧾 Extracted Message:", message);
    console.log("🆔 Session ID:", sessionId);

    // 🔹 INIT SESSION
    if (!sessions[sessionId]) {
      sessions[sessionId] = { greeted: false };
    }

    const session = sessions[sessionId];

    // =====================
    // ❌ EMPTY MESSAGE FIX
    // =====================
    if (!message || message.trim() === "") {
      console.log("⚠️ Empty message received");

      replyText = "Hello 👋 How can I help you today?";
    }

    // =====================
    // 👋 FIRST GREETING
    // =====================
    else if (!session.greeted) {
      session.greeted = true;

      replyText = "Hello 👋 I’m Kind Fintech Bot. How can I help you today?";
      console.log("👋 First greeting sent");
    }

    else {
      console.log("💬 USER:", message);

      const intent = detectIntent(message);
      console.log("🧠 INTENT:", intent);

      // =====================
      // 🎯 INTENT HANDLING
      // =====================
      if (intent === "greeting") {
        replyText = "Hi 👋 How can I help you?";
      }

      else if (intent === "identity") {
        replyText = "I’m Kind Fintech Bot 🤖 I assist with HR-related queries.";
      }

      else {
        const matchedFAQs = searchFAQ(message);
        console.log("📚 FAQ MATCH COUNT:", matchedFAQs.length);

        replyText = await generateReply({
          message,
          contextFAQs: matchedFAQs,
          intent
        });

        console.log("🤖 AI RESPONSE:", replyText);
      }
    }

  } catch (error) {
    console.error("🔥 ERROR OCCURRED:", error);
    replyText = "System error occurred. Please try again.";
  }

  // =====================
  // ✅ ALWAYS RETURN VALID RESPONSE
  // =====================
  const responsePayload = {
    action: "reply",
    replies: [
      {
        type: "text",
        text: replyText || "Sorry, I couldn’t respond."
      }
    ]
  };

  console.log("📤 FINAL RESPONSE:\n", JSON.stringify(responsePayload, null, 2));
  console.log("============== END REQUEST ==============\n");

  return res.json(responsePayload);
});

// =====================
// ❤️ HEALTH CHECK
// =====================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    debug: true
  });
});

// =====================
// 🚀 START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
