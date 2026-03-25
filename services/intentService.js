function detectIntent(message) {
  const msg = message.toLowerCase();

  const greetings = ["hi", "hello", "hey"];

  // 🔥 handle typos like "hwllo"
  if (greetings.some(g => msg.includes(g)) || msg.length <= 5) {
    return "greeting";
  }

  if (msg.includes("your name") || msg.includes("who are you")) {
    return "identity";
  }

  if (msg.includes("what can you do") || msg.includes("help")) {
    return "capability";
  }

  if (msg.startsWith("what is") || msg.startsWith("define")) {
    return "definition";
  }

  if (
    msg.includes("how many") ||
    msg.includes("policy") ||
    msg.includes("leave") ||
    msg.includes("salary")
  ) {
    return "policy";
  }

  return "unknown";
}

module.exports = { detectIntent };
