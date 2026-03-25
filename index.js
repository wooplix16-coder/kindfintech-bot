const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { processMessage } = require("./services/aiService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================
// SESSION MEMORY
// =====================
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
// WEBHOOK
// =====================
app.post("/api/salesiq/webhook", async (req, res) => {
  const message = extractMessage(req.body);
  const sessionId = extractSessionId(req.body);

  console.log("📩 Incoming:", message);

  if (!message) {
    return res.json({
      action: "reply",
      replies: [{ type: "text", text: "I didn’t catch that. Can you rephrase?" }]
    });
  }

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      memory: {},
      history: [],
      lastActive: Date.now()
    };
  }

  const session = sessions[sessionId];
  session.lastActive = Date.now();

  try {
    const faqContext = searchFAQ(message);

    const { reply, memoryUpdates } = await processMessage({
      message,
      memory: session.memory,
      history: session.history.slice(-8),
      faqContext
    });

    // =====================
    // SAFE MEMORY MERGE
    // =====================
    if (memoryUpdates) {
      for (const key in memoryUpdates) {
        if (
          typeof memoryUpdates[key] === "number" &&
          typeof session.memory[key] === "number"
        ) {
          session.memory[key] += memoryUpdates[key];
        } else {
          session.memory[key] = memoryUpdates[key];
        }
      }
    }

    console.log("🧠 Memory:", session.memory);
    console.log("🤖 Reply:", reply);

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
      replies: [{ type: "text", text: "I’m having trouble right now." }]
    });
  }
});

// =====================
// CLEANUP MEMORY
// =====================
setInterval(() => {
  const now = Date.now();
  for (const id in sessions) {
    if (now - sessions[id].lastActive > 2 * 60 * 60 * 1000) {
      delete sessions[id];
    }
  }
}, 30 * 60 * 1000);

app.listen(PORT, () => console.log("🚀 Server running"));
