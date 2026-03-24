const Fuse = require("fuse.js");
const faqs = require("../faqs.json");

const fuse = new Fuse(faqs, {
  keys: ["question"],
  threshold: 0.4
});

function searchFAQ(query) {
  const results = fuse.search(query);
  return results.slice(0, 3).map(r => r.item);
}

module.exports = { searchFAQ };
