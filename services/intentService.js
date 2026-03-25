function detectIntent(message) {
  const msg = message.toLowerCase();

  let intent = "unknown";

  if (["hi", "hello", "hey"].some(g => msg.includes(g))) {
    intent = "greeting";
  } else if (msg.includes("your name") || msg.includes("who are you")) {
    intent = "identity";
  } else if (msg.includes("what can you do") || msg.includes("help")) {
    intent = "capability";
  } else if (msg.startsWith("what is") || msg.startsWith("define")) {
    intent = "definition";
  } else if (
    msg.includes("how many") ||
    msg.includes("policy") ||
    msg.includes("leave")
  ) {
    intent = "policy";
  }

  if (process.env.DEBUG === "true") {
    console.log("🧠 INTENT:", intent, "| MESSAGE:", message);
  }

  return intent;
}

module.exports = { detectIntent };
