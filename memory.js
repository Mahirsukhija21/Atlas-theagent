const fs = require("fs");
const path = require("path");

const MEMORY_FILE = path.join(__dirname, "memory.json");

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading memory:", e.message);
  }
  return { facts: [] };
}

function saveMemory(memory) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving memory:", e.message);
  }
}

function addFact(fact) {
  const memory = loadMemory();
  const alreadyExists = memory.facts.some(
    (f) => f.toLowerCase() === fact.toLowerCase()
  );
  if (!alreadyExists) {
    memory.facts.push(fact);
    saveMemory(memory);
  }
}

function getFacts() {
  const memory = loadMemory();
  return memory.facts;
}

function clearMemory() {
  saveMemory({ facts: [] });
}

module.exports = { addFact, getFacts, clearMemory };