const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { processMessage } = require("./services/aiService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const sessions = {};

// =====================
// HELPERS
// =====================
function extractMessage(body) {
  return (body?.message?.text || body?.message || "").trim();
}

function extractSessionId(body) {
  return body?.visitor?.id || "default";
}

// =====================
// BASIC INTENT HANDLING (NO AI)
// =====================
function handleBasic(message, session) {
  const msg = message.toLowerCase();

  // Greeting (NO AI CALL)
  if (["hi", "hello", "hey"].includes(msg)) {
    return "Hello 👋";
  }

  // Name memory (NO AI CALL)
  const nameMatch = message.match(/my name is (\w+)/i);
  if (nameMatch) {
    session.memory.name = nameMatch[1];
    return `Got it, ${nameMatch[1]}.`;
  }

  if (msg.includes("my name")) {
    return session.memory.name
      ? `Your name is ${session.memory.name}.`
      : "You haven’t told me your name yet.";
  }

  return null;
}

// =====================
// WEBHOOK
// =====================
app.post("/api/salesiq/webhook", async (req, res) => {

  const message = extractMessage(req.body);
  const sessionId = extractSessionId(req.body);

  console.log("📩 USER:", message);

  if (!message) {
    return res.json({
      action: "reply",
      replies: [{ type: "text", text: "Please type something." }]
    });
  }

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      memory: {},
      history: []
    };
  }

  const session = sessions[sessionId];

  // =====================
  // STEP 1: HANDLE BASIC WITHOUT AI
  // =====================
  const basicReply = handleBasic(message, session);
  if (basicReply) {
    return res.json({
      action: "reply",
      replies: [{ type: "text", text: basicReply }]
    });
  }

  try {
    // =====================
    // STEP 2: FAQ CHECK
    // =====================
    const faqContext = searchFAQ(message);

    // =====================
    // STEP 3: AI CALL (ONLY WHEN NEEDED)
    // =====================
    const { reply, memoryUpdates } = await processMessage({
      message,
      memory: session.memory,
      history: session.history.slice(-5),
      faqContext
    });

    // =====================
    // MEMORY UPDATE
    // =====================
    if (memoryUpdates) {
      for (const key in memoryUpdates) {
        if (typeof memoryUpdates[key] === "number") {
          session.memory[key] = (session.memory[key] || 0) + memoryUpdates[key];
        } else {
          session.memory[key] = memoryUpdates[key];
        }
      }
    }

    console.log("🧠 MEMORY:", session.memory);

    session.history.push({ role: "user", content: message });
    session.history.push({ role: "assistant", content: reply });

    return res.json({
      action: "reply",
      replies: [{ type: "text", text: reply }]
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    return res.json({
      action: "reply",
      replies: [{ type: "text", text: "System error. Try again." }]
    });
  }
});

app.listen(PORT, () => console.log("🚀 Server running"));
