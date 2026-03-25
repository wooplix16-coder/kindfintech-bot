const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { detectIntent } = require("./services/intentService");
const { generateAIReply } = require("./services/aiService");
const { extractStructuredData } = require("./services/memoryService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================
// SESSION STORE
// =====================
const sessions = {};

// =====================
// HELPERS
// =====================
function extractMessage(body) {
  return (
    body?.message?.text ||
    body?.data?.message ||
    body?.message ||
    ""
  );
}

function extractSessionId(body) {
  return body?.visitor?.id || "default";
}

// =====================
// WEBHOOK
// =====================
app.post("/api/salesiq/webhook", async (req, res) => {

  const message = extractMessage(req.body);
  const sessionId = extractSessionId(req.body);

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      name: null,
      memory: {}, // 🔥 NEW
      history: [],
      greeted: false
    };
  }

  const session = sessions[sessionId];

  let reply = "";

  try {

    // =====================
    // EMPTY
    // =====================
    if (!message || message.trim() === "") {
      reply = "Hello 👋";
    }

    // =====================
    // FIRST GREETING
    // =====================
    else if (!session.greeted) {
      session.greeted = true;
      reply = "Hello 👋 I’m Kind Fintech Bot.";
    }

    else {

      // =====================
      // EXTRACT STRUCTURED DATA
      // =====================
      const data = extractStructuredData(message);

      // Store name
      if (data.name) {
        session.name = data.name;
        reply = `Got it, ${data.name}.`;
      }

      // =====================
      // STORE GENERIC MEMORY
      // =====================
      else {

        if (data.topic && data.value !== undefined) {

          if (!session.memory[data.topic]) {
            session.memory[data.topic] = {};
          }

          session.memory[data.topic][data.type || "value"] = data.value;
        }

        // =====================
        // NAME RECALL
        // =====================
        if (message.toLowerCase().includes("my name")) {
          reply = session.name
            ? `Your name is ${session.name}.`
            : "You haven’t told me your name yet.";
        }

        else {

          // =====================
          // FAQ PRIORITY
          // =====================
          const faqs = searchFAQ(message);

          if (faqs.length > 0) {

            let answer = faqs[0].answer;

            answer = answer
              .replace("you have", "employees receive")
              .replace("you get", "employees get");

            reply = answer;
          }

          // =====================
          // AI REASONING
          // =====================
          else {
            reply = await generateAIReply({
              message,
              history: session.history.slice(-5),
              name: session.name,
              memory: session.memory
            });
          }
        }
      }
    }

    // =====================
    // SAVE HISTORY
    // =====================
    session.history.push(`User: ${message}`);
    session.history.push(`Bot: ${reply}`);

  } catch (err) {
    console.error("ERROR:", err);
    reply = "Something went wrong.";
  }

  return res.json({
    action: "reply",
    replies: [{ type: "text", text: reply }]
  });
});

app.listen(PORT, () => console.log("🚀 AI Assistant Running"));
