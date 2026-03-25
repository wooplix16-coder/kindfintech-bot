const faqs = require("../faqs.json");

// 🔍 Better matching than your old weak logic
function searchFAQ(message) {
  const msg = message.toLowerCase();

  return faqs.filter(faq => {
    const question = faq.question.toLowerCase();

    // basic keyword match
    return question.includes(msg) ||
      msg.split(" ").some(word => question.includes(word));
  });
}

module.exports = { searchFAQ };
