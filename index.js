const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory session store (mock Redis for free tier)
const sessions = {};

// ─── Health Check ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', bot: 'Kind Fintech Bot', timestamp: new Date().toISOString() });
});

// ─── Main Webhook ────────────────────────────────────────────────
app.post('/api/salesiq/webhook', async (req, res) => {
  try {
    const { message, visitor, session_id } = req.body;

    console.log(`[${session_id}] Message: ${message}`);

    // Load or create session
    if (!sessions[session_id]) {
      sessions[session_id] = { history: [], escalated: false, negativeCount: 0 };
    }
    const session = sessions[session_id];

    // Handle button payloads
    if (message === 'feedback_positive') {
      return res.json({
        replies: [{ text: '😊 Great! Glad I could help. Is there anything else you need?' }]
      });
    }

    if (message === 'feedback_negative') {
      session.negativeCount++;
      if (session.negativeCount >= 2) {
        return res.json({
          action: 'handoff',
          replies: [{ text: "Let me connect you with a support agent who can help you better." }]
        });
      }
      return res.json({
        replies: [
          { text: "I'm sorry that didn't help. Let me try again or I can escalate this." },
          {
            buttons: [
              { label: '🔁 Try again', payload: 'retry' },
              { label: '👤 Talk to agent', payload: 'request_human' },
              { label: '🎫 Create ticket', payload: 'create_ticket' }
            ]
          }
        ]
      });
    }

    if (message === 'request_human') {
      return res.json({
        action: 'handoff',
        replies: [{ text: "Connecting you to a live agent now. Please wait a moment..." }]
      });
    }

    if (message === 'create_ticket') {
      return res.json({
        action: 'create_ticket',
        ticket: {
          subject: 'Customer Support Request',
          description: buildTranscript(session.history),
          priority: 'Medium'
        },
        replies: [{ text: "✅ I've raised a support ticket for you. Our team will respond within 24 hours via email." }]
      });
    }

    // Call Claude API
    session.history.push({ role: 'user', content: message });
    const aiReply = await callClaude(session.history, visitor);
    session.history.push({ role: 'assistant', content: aiReply });

    // Check for escalation signal
    if (aiReply.includes('[ESCALATE]')) {
      const cleanReply = aiReply.replace('[ESCALATE]', '').trim();
      return res.json({
        replies: [
          { text: cleanReply },
          {
            buttons: [
              { label: '👤 Talk to agent', payload: 'request_human' },
              { label: '🎫 Create a ticket', payload: 'create_ticket' }
            ]
          }
        ]
      });
    }

    // Standard response with feedback buttons
    return res.json({
      replies: [
        { text: aiReply },
        {
          buttons: [
            { label: '✅ Yes, helped!', payload: 'feedback_positive' },
            { label: '❌ Need more help', payload: 'feedback_negative' }
          ]
        }
      ]
    });

  } catch (err) {
    console.error('Webhook error:', err.message);
    res.json({
      replies: [{ text: "I'm having trouble right now. Please try again in a moment or contact support directly." }]
    });
  }
});

// ─── Agent Handoff Callback ──────────────────────────────────────
app.post('/api/salesiq/webhook/handoff', (req, res) => {
  console.log('Handoff occurred:', req.body);
  res.json({ status: 'logged' });
});

// ─── Claude API Call ─────────────────────────────────────────────
async function callClaude(history, visitor) {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY) {
    // Mock response if no API key set (for initial testing)
    return getMockResponse(history[history.length - 1].content);
  }

  const systemPrompt = buildSystemPrompt(visitor);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: history
    })
  });

  const data = await response.json();

  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// ─── System Prompt ───────────────────────────────────────────────
function buildSystemPrompt(visitor) {
  return `You are a helpful customer support assistant for Kind Fintech (kindswap.world).
Your job is to answer customer questions clearly and concisely.

VISITOR INFO:
- Name: ${visitor?.name || 'Guest'}
- Page: ${visitor?.current_page || 'website'}

KNOWLEDGE BASE:
- Kind Fintech provides financial technology services
- Support hours: Mon-Fri 9AM-6PM IST
- For account issues, customers need their registered email
- Refunds take 5-7 business days
- Technical issues can be reported via ticket
- Contact email: support@kindswap.world

RULES:
1. Answer ONLY from the knowledge base above
2. Be friendly, concise, and helpful
3. If you cannot answer confidently, include [ESCALATE] at the START of your reply, then explain what you know
4. Never make up information
5. Keep responses under 100 words`;
}

// ─── Mock Response (when no API key) ────────────────────────────
function getMockResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes('refund')) return "Refunds typically take 5-7 business days to process. Please ensure your request is submitted with your registered email. Would this help?";
  if (msg.includes('account') || msg.includes('login')) return "For account issues, please have your registered email ready. I can connect you with our team if needed.";
  if (msg.includes('hours') || msg.includes('time')) return "Our support team is available Monday to Friday, 9AM to 6PM IST.";
  if (msg.includes('hello') || msg.includes('hi')) return "Hello! 👋 Welcome to Kind Fintech support. How can I help you today?";
  return "[ESCALATE] I don't have specific information about that in my knowledge base. Let me connect you with our support team who can help you better.";
}

// ─── Build Transcript ────────────────────────────────────────────
function buildTranscript(history) {
  return history.map(m => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.content}`).join('\n');
}

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Kind Fintech Bot running on port ${PORT}`);
});
