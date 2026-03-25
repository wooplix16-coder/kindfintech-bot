function extractStructuredData(message) {
  const lower = message.toLowerCase();

  let data = {};

  // Extract name
  const nameMatch = message.match(/my name is (\w+)/i);
  if (nameMatch) {
    data.name = nameMatch[1];
  }

  // Extract numbers with context
  const numberMatch = message.match(/(\d+)/);
  if (numberMatch) {
    data.value = parseInt(numberMatch[1]);
  }

  // Detect topic dynamically
  if (lower.includes("leave")) data.topic = "leave";
  else if (lower.includes("hour")) data.topic = "hours";
  else if (lower.includes("task")) data.topic = "tasks";

  // Detect action
  if (lower.includes("taken") || lower.includes("used")) {
    data.type = "used";
  }

  return data;
}

module.exports = { extractStructuredData };
