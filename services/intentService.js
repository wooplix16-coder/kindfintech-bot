function detectIntent(message) {
  const msg = message.toLowerCase();

  if (["hi", "hello", "hey", "good morning", "good evening"].some(g => msg.includes(g))) {
    return "greeting";
  }

  if (msg.trim().length < 2) {
    return "empty";
  }

  return "query";
}

module.exports = { detectIntent };
