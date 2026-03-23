# Kind Fintech Bot — Zoho SalesIQ Webhook Backend

AI-powered customer support bot using Claude + Zoho SalesIQ.

## Deploy to Railway (Free)

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Select this repo
4. Add environment variable: `CLAUDE_API_KEY` = your key from console.anthropic.com
5. Deploy → copy the generated URL
6. Paste URL into Zoho SalesIQ Zobot webhook settings

## Webhook URL format
`https://YOUR-RAILWAY-URL/api/salesiq/webhook`

## Test it
`GET https://YOUR-RAILWAY-URL/health` → should return `{"status":"OK"}`

## Features
- Claude AI responses (falls back to mock if no API key)
- Session memory per chat
- Escalation detection via [ESCALATE] token
- Live agent handoff
- Zoho Desk ticket creation
- Feedback buttons
