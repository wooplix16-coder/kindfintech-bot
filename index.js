const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// ─── FAQ Knowledge Base ───────────────────────────────────────────────────────
const FAQ_CONTENT = `
COMPANY: Kind Fintech
PRODUCT: KindSwap - a fintech platform for currency exchange and financial services.

Q: What are your fees?
A: KindSwap charges 0.5% per transaction with no hidden fees. International transfers have a flat fee of $2.
`;

// ─── Session Store ────────────────────────────────────────────────────────────
const sessions = {};

function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { history: [], escalationCount: 0 };
  }
  return sessions[sessionId];
}

// ─── Gemini Call ──────────────────────────────────────────────────────────────
async function callGemini(sessionId, userMessage, visitorInfo) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const session = getSession(sessionId);

  const prompt = `
You are a support assistant. Answer ONLY from FAQ.

FAQ:
${FAQ_CONTENT}

User: ${userMessage}
Answer:
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("GEMINI RAW RESPONSE:", JSON.stringify(response.data, null, 2));

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("Empty response from Gemini");
    }

    return aiText;

  } catch (error) {
    console.error("FULL ERROR:", JSON.stringify(error?.response?.data, null, 2));
    console.error("MESSAGE:", error.message);
    throw error;
  }
}

// ─── Webhook ──────────────────────────────────────────────────────────────────
app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    const { message, session_id } = req.body;

    console.log("Incoming message:", message);

    let reply;

    if (GEMINI_API_KEY) {
      reply = await callGemini(session_id, message, {});
    } else {
      reply = "Mock response: API key missing.";
    }

    return res.json({
      replies: [
        {
          type: "text",
          text: reply
        }
      ]
    });

  } catch (error) {
    console.error("FINAL ERROR:", error.message);

    return res.json({
      replies: [
        {
          type: "text",
          text: "AI failed. Check logs."
        }
      ],
      action: "handoff"
    });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    ai: GEMINI_API_KEY ? "Gemini connected" : "Missing key"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
