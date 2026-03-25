const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

// ⚠️ USE LIGHT MODEL (IMPORTANT)
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// =====================
// RATE LIMIT CONTROL
// =====================
let lastCallTime = 0;

function canCallAI() {
  const now = Date.now();
  if (now - lastCallTime < 1500) return false; // 1.5 sec gap
  lastCallTime = now;
  return true;
}

// =====================
// MAIN FUNCTION
// =====================
async function processMessage({ message, memory, history, faqContext }) {

  // 🚨 PREVENT SPAM CALLS
  if (!canCallAI()) {
    return {
      reply: "Please wait a moment before sending another message.",
      memoryUpdates: {}
    };
  }

  const prompt = buildPrompt({ message, memory, history, faqContext });

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 400
    }
  };

  try {
    const res = await axios.post(URL, payload, { timeout: 15000 });

    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🔵 RAW AI:", raw);

    const parsed = safeParse(raw);

    if (!parsed) {
      return {
        reply: raw || "I couldn't understand that.",
        memoryUpdates: {}
      };
    }

    return parsed;

  } catch (err) {
    const status = err.response?.status;

    console.error("❌ AI ERROR:", status, err.response?.data || err.message);

    // 🚨 429 HANDLING (MAIN FIX)
    if (status === 429) {
      return {
        reply: "I'm getting too many requests right now. Please try again in a few seconds.",
        memoryUpdates: {}
      };
    }

    return {
      reply: "Something went wrong while processing your request.",
      memoryUpdates: {}
    };
  }
}

// =====================
// PROMPT (SHORTER = LESS TOKENS)
// =====================
function buildPrompt({ message, memory, history, faqContext }) {
  return `
You are an HR assistant.

Memory:
${JSON.stringify(memory)}

FAQ:
${faqContext}

Rules:
- Use FAQ for policy numbers
- If user gives numbers → store them
- Do calculations when needed
- Do NOT repeat same sentence again and again
- Do NOT say "how can I help you" every time

Return JSON ONLY:
{"reply":"...","memoryUpdates":{}}

User: ${message}
`;
}

// =====================
// SAFE PARSER
// =====================
function safeParse(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

module.exports = { processMessage };
