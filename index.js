console.log("🚀 NEW CODE DEPLOYED");

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// ─── Simple FAQ ───────────────────────────────────────────────────────────────
const FAQ = `
Q: What are your fees?
A: KindSwap charges 0.5% per transaction with no hidden fees. International transfers have a flat fee of $2.
`;

// ─── Gemini Call ──────────────────────────────────────────────────────────────
async function callGemini(message) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const prompt = `
Answer ONLY using this FAQ:

${FAQ}

User: ${message}
Answer:
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ GEMINI RESPONSE:", JSON.stringify(response.data, null, 2));

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty Gemini response");
    }

    return text;

  } catch (error) {
    console.error("❌ FULL ERROR:", JSON.stringify(error?.response?.data, null, 2));
    console.error("❌ MESSAGE:", error.message);
    throw error;
  }
}

// ─── Webhook ──────────────────────────────────────────────────────────────────
app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("📩 Incoming:", message);

    const reply = await callGemini(message);

    return res.json({
      replies: [
        {
          type: "text",
          text: reply
        }
      ]
    });

  } catch (error) {
    console.error("🔥 FINAL ERROR:", error.message);

    return res.json({
      replies: [
        {
          type: "text",
          text: "AI failed. Check server logs."
        }
      ],
      action: "handoff"
    });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    ai: GEMINI_API_KEY ? "Gemini connected" : "Missing key"
  });
});

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "KindFintech Bot is running",
    status: "OK"
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 AI Mode: ${GEMINI_API_KEY ? "Gemini" : "Mock"}`);
});
