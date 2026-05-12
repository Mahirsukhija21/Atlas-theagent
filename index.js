const readline = require("readline");
const { chat, clearHistory, AGENT_NAME } = require("./agent.js");
const { clearMemory, getFacts } = require("./memory.js");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  const facts = getFacts();

  console.log(`\n🤖  ${AGENT_NAME} is ready! (Powered by Ollama)`);
  console.log(`    Type your message and press Enter.`);
  console.log(`    Commands: /clear (reset chat) | /clearmemory (wipe memory) | /memory (show memory) | /exit (quit)`);

  if (facts.length > 0) {
    console.log(`\n💾  Loaded ${facts.length} memory fact(s) from last session.`);
  }

  console.log("");

  while (true) {
    const input = await ask("You: ");

    if (input.trim() === "/exit") {
      console.log(`\n${AGENT_NAME}: Goodbye! 👋\n`);
      rl.close();
      break;
    }

    if (input.trim() === "/clear") {
      clearHistory();
      console.log(`\n[Chat history cleared]\n`);
      continue;
    }

    if (input.trim() === "/clearmemory") {
      clearMemory();
      console.log(`\n[Long-term memory wiped]\n`);
      continue;
    }

    if (input.trim() === "/memory") {
      const currentFacts = getFacts();
      if (currentFacts.length === 0) {
        console.log(`\n[No memories saved yet]\n`);
      } else {
        console.log(`\n💾 Saved memories:`);
        currentFacts.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
        console.log("");
      }
      continue;
    }

    if (!input.trim()) continue;

    try {
      console.log(`\n${AGENT_NAME}: thinking...\n`);
      const reply = await chat(input);
      console.log(`${AGENT_NAME}: ${reply}\n`);
    } catch (error) {
      console.error(`\n[Error]: ${error.message}\n`);
    }
  }
}

main();