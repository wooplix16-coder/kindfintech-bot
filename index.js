const express = require("express");
const { searchFAQ } = require("./services/faqService");
const { generateAIReply } = require("./services/aiService");
const { extractFactsAI } = require("./services/memoryService");

const app = express();
app.use(express.json());

const sessions = {};

function extractMessage(body) {
  return body?.message?.text || body?.message || "";
}

function extractSessionId(body) {
  return body?.visitor?.id || "default";
}

app.post("/api/salesiq/webhook", async (req, res) => {

  const message = extractMessage(req.body);
  const sessionId = extractSessionId(req.body);

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      memory: {},
      history: [],
      greeted: false
    };
  }

  const session = sessions[sessionId];

  let reply = "";

  try {

    // FIRST GREETING
    if (!session.greeted) {
      session.greeted = true;
      reply = "Hello 👋 I’m Kind Fintech Bot.";
    }

    else {

      // =====================
      // AI FACT EXTRACTION
      // =====================
      const facts = await extractFactsAI(message, session.memory);

      // MERGE MEMORY
      if (facts.name) {
        session.memory.name = facts.name;
      }

      if (facts.topic && facts.value !== undefined) {
        if (!session.memory[facts.topic]) {
          session.memory[facts.topic] = {};
        }

        session.memory[facts.topic][facts.type || "value"] = facts.value;
      }

      // =====================
      // FAQ CONTEXT (NOT CONTROL)
      // =====================
      const faqs = searchFAQ(message);

      const faqContext = faqs.length
        ? faqs.map(f => `Q:${f.question} A:${f.answer}`).join("\n")
        : "None";

      // =====================
      // AI RESPONSE
      // =====================
      reply = await generateAIReply({
        message,
        memory: session.memory,
        history: session.history.slice(-5),
        faqContext
      });
    }

    // SAVE HISTORY
    session.history.push(`User: ${message}`);
    session.history.push(`Bot: ${reply}`);

  } catch (err) {
    console.error(err);
    reply = "Something went wrong.";
  }

  return res.json({
    action: "reply",
    replies: [{ type: "text", text: reply }]
  });
});

app.listen(3000, () => console.log("🚀 Fully AI Dynamic System"));
