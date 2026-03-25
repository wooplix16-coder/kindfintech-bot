const faqs = require("../faqs.json");

function searchFAQ(message) {
  const msg = message.toLowerCase();

  const results = faqs.map(faq => {
    let score = 0;

    msg.split(" ").forEach(word => {
      if (faq.question.toLowerCase().includes(word)) {
        score++;
      }
    });

    return { ...faq, score };
  });

  const filtered = results
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (process.env.DEBUG === "true") {
    console.log("📊 FAQ MATCH RESULTS:");
    filtered.forEach(f =>
      console.log(`→ ${f.question} | score=${f.score}`)
    );
  }

  return filtered;
}

module.exports = { searchFAQ };
