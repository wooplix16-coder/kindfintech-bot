const Fuse = require("fuse.js");
const faqs = require("../faqs.json");

const fuse = new Fuse(faqs, {
  keys: ["question", "answer"],
  threshold: 0.4,        // 0 = exact, 1 = match anything
  includeScore: true,
  minMatchCharLength: 3,
  ignoreLocation: true
});

function searchFAQ(message) {
  if (!message || message.trim().length < 3) return "No relevant policy found.";

  const results = fuse.search(message, { limit: 4 });

  if (results.length === 0) return "No relevant policy found.";

  // Format as context string for AI
  const contextLines = results
    .filter(r => r.score < 0.5) // only reasonably close matches
    .map(r => `- ${r.item.question}: ${r.item.answer}`);

  if (contextLines.length === 0) return "No relevant policy found.";

  console.log(`📊 FAQ matched ${contextLines.length} entries for: "${message}"`);
  return contextLines.join("\n");
}

module.exports = { searchFAQ };
```

---

### 4. Delete `intentService.js` and `memoryService.js`

You don't need these anymore. The AI handles intent detection and fact extraction inside the single prompt. Keeping them creates the "hybrid conflict" you described. Delete both files and remove their imports.

---

### 5. `.env` — Add the right key name
```
GEMINI_API_KEY=your_actual_key_here
PORT=3000
```

---

## Why This Works: Key Design Decisions Explained

**Single structured output call**: Instead of calling AI twice (extract facts, then generate reply), one call does both. The AI returns `{ reply, memoryUpdates }` atomically. This eliminates the coordination failure between your services.

**JSON output enforcement with graceful fallback**: The prompt demands JSON. `parseStructuredResponse` handles the case where Gemini wraps it in markdown fences or returns plain text. Your current code crashes on parse failures.

**Memory merging in index.js, not AI**: The AI tells you *what* to update (`memoryUpdates`), but `index.js` controls *how* to merge it. This keeps memory ownership clear and prevents the AI from accidentally wiping stored facts.

**Fuse.js with proper threshold**: Your current FAQ matcher scores "how many leaves do I have?" highly for *every* FAQ entry containing "leaves" because it splits by spaces. Fuse.js does fuzzy matching on the full question string, which is far more accurate.

**Retry with backoff**: Your current code throws immediately on 429. The retry loop handles Gemini's free tier rate limits gracefully.

---

## Prompt Engineering Deep Dive

The most important part is the **memory section** in the prompt. Here's exactly what happens for your leave calculation example:
```
User: "I've taken 7 sick leaves"
→ AI returns: { reply: "Got it! I've noted that...", memoryUpdates: { leavesUsed: 7, leaveType: "sick" } }
→ session.memory becomes: { leavesUsed: 7, leaveType: "sick" }

User: "How many sick leaves do I have left?"
→ Prompt includes memory: { leavesUsed: 7, leaveType: "sick" }
→ FAQ context includes: "Employees are allowed 10 sick leaves per year"
→ AI reasons: 10 - 7 = 3, returns natural response
