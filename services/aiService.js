const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

// ✅ Gemini 2.5 Flash (CORRECT)
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function processMessage({ message, memory, history, faqContext }) {

  const prompt = buildPrompt({ message, memory, history, faqContext });

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 500
    }
  };

  try {
    const res = await retryCall(payload);

    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parsed = safeParse(raw);

    if (!parsed) {
      return {
        reply: raw || "I couldn't process that.",
        memoryUpdates: {}
      };
    }

    return parsed;

  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    throw err;
  }
}

// =====================
// PROMPT
// =====================
function buildPrompt({ message, memory, history, faqContext }) {
  return `
You are a smart HR assistant.

MEMORY:
${JSON.stringify(memory)}

HISTORY:
${history.map(h => `${h.role}: ${h.content}`).join("\n")}

FAQ:
${faqContext}

RULES:
- Use FAQ as source of truth
- Never assume values
- If user gives numbers → store & use
- Do calculations when needed
- If no data → say you don't know
- Avoid repetition
- No "How can I help you" spam

RETURN JSON ONLY:
{
 "reply": "...",
 "memoryUpdates": {}
}

User: ${message}
`;
}

// =====================
// SAFE JSON PARSE
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
// RETRY LOGIC
// =====================
async function retryCall(payload, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.post(URL, payload);
    } catch (err) {
      if (err.response?.status === 429 && i < retries - 1) {
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
