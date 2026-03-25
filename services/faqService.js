const faqs = require("../faqs.json");

function searchFAQ(message) {
  const msg = message.toLowerCase();

  return faqs
    .map(faq => {
      let score = 0;

      const words = msg.split(" ");

      words.forEach(word => {
        if (faq.question.toLowerCase().includes(word)) {
          score++;
        }
      });

      return { ...faq, score };
    })
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // top 3 matches
}

module.exports = { searchFAQ };
