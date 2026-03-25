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
    .filter(f => f.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log("📊 FAQ MATCH:", filtered.length);

  return filtered;
}

module.exports = { searchFAQ };
