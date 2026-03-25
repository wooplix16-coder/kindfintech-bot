const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

// ✅ Gemini 2.5 Flash
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function processMessage({ message, memory, history, faqContext }) {

  const prompt = buildPrompt({ message, memory, history, faqContext });

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600
    }
  };

  try {
    const res = await retryCall(payload);

    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🔵 RAW AI:", raw);

    const parsed = safeParse(raw);

    if (!parsed) {
      return {
        reply: raw || "I couldn't process that.",
        memoryUpdates: {}
      };
    }

    return parsed;

  } catch (err) {
    console.error("❌ AI ERROR:", err.response?.data || err.message);
    throw err;
  }
}

function buildPrompt({ message, memory, history, faqContext }) {
  return `
You are an intelligent HR assistant.

MEMORY:
${JSON.stringify(memory)}

HISTORY:
${history.map(h => `${h.role}: ${h.content}`).join("\n")}

FAQ:
${faqContext}

IMPORTANT RULES:
- Use FAQ for policy numbers
- NEVER assume numbers
- Store data in structured format:
  {
    "used_casual_leave": number,
    "used_sick_leave": number,
    "used_total_leave": number
  }

- If user gives multiple values:
  "2 casual and 1 sick"
  → store BOTH separately

- When calculating:
  casual_total = 12
  sick_total = 10
  total_leave = 22

- ALWAYS calculate remaining correctly
- NEVER say "I have trouble"
- NO repetition

RETURN STRICT JSON:
{
 "reply": "...",
 "memoryUpdates": {}
}

User: ${message}
`;
}

// =====================
// SAFE PARSER (CRITICAL)
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

// =====================
// RETRY
// =====================
async function retryCall(payload, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.post(URL, payload);
    } catch (err) {
      const status = err.response?.status;

      if ((status === 429 || status === 503) && i < retries - 1) {
        console.log("⏳ Retry...");
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

module.exports = { processMessage };
