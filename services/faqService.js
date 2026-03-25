const Fuse = require("fuse.js");
const faqs = require("../faqs.json");

const fuse = new Fuse(faqs, {
  keys: ["question", "answer"],
  threshold: 0.4,
  ignoreLocation: true
});

function searchFAQ(message) {
  const results = fuse.search(message, { limit: 5 });

  if (!results.length) return "No policy found.";

  return results
    .map(r => `Q: ${r.item.question}\nA: ${r.item.answer}`)
    .join("\n\n");
}

module.exports = { searchFAQ };
