const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { processMessage } = require("./services/aiService");

const app = express();
app.use(express.json());

const sessions = {};

function extractMessage(body) {
  return (body?.message?.text || body?.message || "").trim();
}

function extractSessionId(body) {
  return body?.visitor?.id || "default";
}

app.post("/api/salesiq/webhook", async (req, res) => {
  const message = extractMessage(req.body);
  const sessionId = extractSessionId(req.body);

  if (!message) {
    return res.json({
      action: "reply",
      replies: [{ type: "text", text: "I didn't catch that. Could you rephrase?" }]
    });
  }

  if (!sessions[sessionId]) {
    sessions[sessionId] = { memory: {}, history: [] };
  }

  const session = sessions[sessionId];

  try {
    // Get relevant FAQ context
    const faqContext = searchFAQ(message);

    // Single AI call that handles everything
    const { reply, memoryUpdates } = await processMessage({
      message,
      memory: session.memory,
      history: session.history.slice(-8), // last 4 exchanges
      faqContext
    });

    // Merge memory updates returned by AI
    if (memoryUpdates && typeof memoryUpdates === "object") {
      session.memory = { ...session.memory, ...memoryUpdates };
    }

    // Store history as pairs
    session.history.push({ role: "user", content: message });
    session.history.push({ role: "assistant", content: reply });

    return res.json({
      action: "reply",
      replies: [{ type: "text", text: reply }]
    });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err.message);
    return res.json({
      action: "reply",
      replies: [{ type: "text", text: "I'm having a moment. Please try again." }]
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 HR Bot running on port ${PORT}`));
