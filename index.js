const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// ─── FAQ Knowledge Base ───────────────────────────────────────────────────────
// Add your client's FAQs here. This gets injected into Gemini's system prompt.
const FAQ_CONTENT = `
COMPANY: Kind Fintech
PRODUCT: KindSwap - a fintech platform for currency exchange and financial services.

FREQUENTLY ASKED QUESTIONS:

Q: How do I reset my password?
A: Go to Settings > Security > Reset Password. Enter your registered email and follow the link sent to you.

Q: How long does a transfer take?
A: Most transfers complete within 24 hours. International transfers may take 2-3 business days.

Q: What are your fees?
A: KindSwap charges 0.5% per transaction with no hidden fees. International transfers have a flat fee of $2.

Q: How do I verify my account?
A: Upload a government-issued ID and a selfie in the Verification section of your profile.

Q: Is my money safe?
A: Yes. KindSwap uses bank-level 256-bit encryption and is regulated under applicable financial laws.

Q: How do I contact support?
A: You can chat with us here, email support@kindswap.world, or call +1-800-KIND-FIN during business hours.

Q: How do I add a bank account?
A: Go to Wallet > Add Account > select your bank and follow the verification steps.

Q: What currencies do you support?
A: We support 30+ currencies including USD, EUR, GBP, INR, AED, and more.

Q: How do I cancel a transaction?
A: Transactions can be cancelled within 30 minutes of initiation from the Transaction History screen.

Q: What is the minimum transfer amount?
A: The minimum transfer is $10 or equivalent in your local currency.
`;

// ─── Session Store (in-memory) ────────────────────────────────────────────────
const sessions = {};

function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { history: [], escalationCount: 0 };
  }
  return sessions[sessionId];
}

// ─── Call Gemini API ──────────────────────────────────────────────────────────
async function callGemini(sessionId, userMessage, visitorInfo) {
  const session = getSession(sessionId);

  const systemPrompt = `You are a helpful customer support assistant for Kind Fintech (KindSwap).

IMPORTANT RULES:
1. Answer questions ONLY from the FAQ knowledge base provided below.
2. If the question is not covered in the FAQ, say "I don't have information on that, let me connect you with a support agent." and include [ESCALATE] at the end of your response.
3. Keep responses concise, friendly, and professional.
4. Never make up information or prices not in the FAQ.
5. If the visitor asks to speak to a human, include [ESCALATE] in your response.
6. If the visitor seems frustrated or repeats the same question, include [ESCALATE] in your response.

VISITOR INFO:
- Name: ${visitorInfo.name || "Visitor"}
- Email: ${visitorInfo.email || "Not provided"}
- Current Page: ${visitorInfo.current_page || "Unknown"}

FAQ KNOWLEDGE BASE:
${FAQ_CONTENT}`;

  // Build conversation history for context
  const conversationHistory = session.history
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  const fullPrompt = conversationHistory
    ? `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nUser: ${userMessage}\nAssistant:`
    : `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    },
    { headers: { "Content-Type": "application/json" } }
  );

  const aiText =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm sorry, I couldn't process your request. Let me connect you with a support agent. [ESCALATE]";

  // Save to session history
  session.history.push({ role: "user", content: userMessage });
  session.history.push({ role: "assistant", content: aiText });

  // Keep history to last 10 messages to avoid token bloat
  if (session.history.length > 10) {
    session.history = session.history.slice(-10);
  }

  return aiText;
}

// ─── Mock Response (fallback if no API key) ───────────────────────────────────
function getMockResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes("password")) return "To reset your password, go to Settings > Security > Reset Password and follow the instructions sent to your email.";
  if (msg.includes("fee") || msg.includes("cost") || msg.includes("price")) return "KindSwap charges 0.5% per transaction with no hidden fees. International transfers have a flat fee of $2.";
  if (msg.includes("transfer") || msg.includes("how long")) return "Most transfers complete within 24 hours. International transfers may take 2-3 business days.";
  if (msg.includes("verify") || msg.includes("verification")) return "To verify your account, upload a government-issued ID and a selfie in the Verification section of your profile.";
  if (msg.includes("human") || msg.includes("agent") || msg.includes("support")) return "Let me connect you with a support agent right away. [ESCALATE]";
  return "Thank you for your question! I can help you with password resets, transfers, fees, account verification, and more. Could you please provide more details about your issue?";
}

// ─── Format SalesIQ Response ──────────────────────────────────────────────────
function formatResponse(aiText, sessionId) {
  const shouldEscalate = aiText.includes("[ESCALATE]");
  const cleanText = aiText.replace("[ESCALATE]", "").trim();
  const session = getSession(sessionId);

  if (shouldEscalate) {
    session.escalationCount++;
    // If agents likely offline, create ticket instead
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour <= 18;

    if (isBusinessHours) {
      return {
        action: "handoff",
        replies: [{ type: "text", text: cleanText }],
      };
    } else {
      return {
        action: "create_ticket",
        ticket: {
          subject: "Support Request from KindBot",
          description: `Customer needs assistance. Chat session: ${sessionId}`,
          priority: "Medium",
        },
        replies: [
          {
            type: "text",
            text: `${cleanText}\n\nOur team is currently offline. I've created a support ticket for you and we'll respond within 24 hours.`,
          },
        ],
      };
    }
  }

  // Normal response with feedback buttons
  return {
    replies: [
      { type: "text", text: cleanText },
      {
        type: "buttons",
        buttons: [
          { label: "✅ Yes, this helped", payload: "feedback_positive" },
          { label: "❌ No, I need more help", payload: "feedback_negative" },
        ],
      },
    ],
  };
}

// ─── Handle Button Payloads ───────────────────────────────────────────────────
function handlePayload(payload, sessionId) {
  if (payload === "feedback_positive") {
    return {
      replies: [
        { type: "text", text: "Great! I'm glad I could help. 😊 Is there anything else you need?" },
      ],
    };
  }
  if (payload === "feedback_negative") {
    const session = getSession(sessionId);
    session.escalationCount++;
    if (session.escalationCount >= 2) {
      return {
        action: "handoff",
        replies: [{ type: "text", text: "I'm sorry I couldn't fully help. Let me connect you with a human agent who can assist you better." }],
      };
    }
    return {
      replies: [
        { type: "text", text: "I'm sorry about that! Could you describe your issue in more detail so I can try to help better?" },
      ],
    };
  }
  return null;
}

// ─── Main Webhook Endpoint ────────────────────────────────────────────────────
app.post("/api/salesiq/webhook", async (req, res) => {
  try {
    const { message, visitor = {}, session_id, context = {} } = req.body;
    const payload = context?.button_payload || null;

    console.log(`[${new Date().toISOString()}] Session: ${session_id} | Message: ${message}`);

    // Handle button clicks
    if (payload) {
      const payloadResponse = handlePayload(payload, session_id);
      if (payloadResponse) return res.json(payloadResponse);
    }

    // No message? Send welcome
    if (!message || message.trim() === "") {
      return res.json({
        replies: [
          { type: "text", text: `Hi ${visitor.name || "there"}! 👋 I'm KindBot, your KindSwap support assistant. How can I help you today?` },
          {
            type: "buttons",
            buttons: [
              { label: "💸 Transfer questions", payload: "topic_transfer" },
              { label: "🔐 Account & security", payload: "topic_account" },
              { label: "💰 Fees & pricing", payload: "topic_fees" },
              { label: "🙋 Talk to a human", payload: "feedback_negative" },
            ],
          },
        ],
      });
    }

    let aiText;
    if (GEMINI_API_KEY) {
      aiText = await callGemini(session_id, message, visitor);
    } else {
      console.log("No GEMINI_API_KEY found — using mock responses");
      aiText = getMockResponse(message);
    }

    const response = formatResponse(aiText, session_id);
    return res.json(response);

  } catch (error) {
    console.error("Webhook error:", error?.response?.data || error.message);
    return res.json({
      replies: [
        { type: "text", text: "I'm having a technical issue right now. Let me connect you with a support agent." },
      ],
      action: "handoff",
    });
  }
});

// ─── Handoff Callback ─────────────────────────────────────────────────────────
app.post("/api/salesiq/webhook/handoff", (req, res) => {
  console.log("Handoff event:", req.body);
  res.json({ status: "ok" });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    ai: GEMINI_API_KEY ? "Gemini API connected" : "Mock mode (add GEMINI_API_KEY)",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ message: "KindFintech Bot is running!", status: "OK" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ KindFintech Bot running on port ${PORT}`);
  console.log(`🤖 AI Mode: ${GEMINI_API_KEY ? "Gemini API" : "Mock responses"}`);
});
