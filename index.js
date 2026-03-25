const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { processMessage } = require("./services/aiService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
      history: [],
      lastActive: Date.now()
    };
  }

  const session = sessions[sessionId];

  try {
    const faqContext = searchFAQ(message);

    const { reply, memoryUpdates } = await processMessage({
      message,
      memory: session.memory,
      history: session.history.slice(-8),
      faqContext
    });

    // =====================
    // INTELLIGENT MEMORY MERGE
    // =====================
    if (memoryUpdates) {
      for (const key in memoryUpdates) {

        if (typeof memoryUpdates[key] === "number") {
          // accumulate only for numeric fields
          session.memory[key] = (session.memory[key] || 0) + memoryUpdates[key];
        } else {
          session.memory[key] = memoryUpdates[key];
        }

      }
    }

    console.log("🧠 MEMORY:", session.memory);
    console.log("🤖 REPLY:", reply);

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
      replies: [{ type: "text", text: "Something went wrong." }]
    });
  }
});

app.listen(PORT, () => console.log("🚀 Server running"));
