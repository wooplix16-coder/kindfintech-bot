const faqs = require("../faqs.json");

function searchFAQ(message) {
  const msg = message.toLowerCase();

  const results = faqs.map(faq => {
    let score = 0;

    const words = msg.split(" ");

    words.forEach(word => {
      if (faq.question.toLowerCase().includes(word)) {
        score++;
      }
    });

    return { ...faq, score };
  });

  return results
    .filter(f => f.score >= 2) // 🔥 threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

module.exports = { searchFAQ };
