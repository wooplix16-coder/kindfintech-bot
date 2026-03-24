console.log("🚀 NEW CODE DEPLOYED");

const express = require("express");
const axios = require("axios");
const { searchFAQ } = require("./services/faqService");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// ─── Gemini Call ──────────────────────────────────────────────────────────────
async function callGemini(message) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  // 🔥 STEP 1: Search relevant FAQs
  const matchedFAQs = searchFAQ(message);

  // 🔥 STEP 2: Build context
  const context = matchedFAQs.length
    ? matchedFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "No relevant FAQ found.";

  const prompt = `
You are an HR support chatbot.

Answer ONLY using the FAQ below.
If answer is not found, say politely you are not sure and suggest contacting HR.

FAQ:
${context}

User: ${message}
Answer:
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

    console.log("✅ GEMINI RESPONSE RECEIVED");

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty Gemini response");
    }

    return text;

  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    throw error;
  }
}

// ─── Zoho Webhook ─────────────────────────────────────────────────────────────
app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    console.log("📥 RAW BODY:", JSON.stringify(req.body, null, 2));

    // 🔥 FIXED message extraction
    const message =
      req.body?.message?.text ||
      req.body?.message ||
      "";

    console.log("📩 Extracted message:", message);

    if (!message) {
      return res.json({
        action: "reply",
        replies: [
          {
            type: "text",
            text: "No message received."
          }
        ]
      });
    }

    const reply = await callGemini(message);

    return res.json({
      action: "reply",
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
      action: "reply",
      replies: [
        {
          type: "text",
          text: "Something went wrong. Connecting to human."
        }
      ]
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
