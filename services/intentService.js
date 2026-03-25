function detectIntent(message) {
  const msg = message.toLowerCase();

  if (["hi", "hello", "hey"].some(g => msg.includes(g))) {
    return "greeting";
  }

  if (msg.length < 3) {
    return "unknown";
  }

  return "query";
}

module.exports = { detectIntent };
