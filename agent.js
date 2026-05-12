const dotenv = require("dotenv");
dotenv.config();

const { TOOLS, runTool } = require("./tools.js");
const { addFact, getFacts } = require("./memory.js");

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const MODEL = process.env.MODEL || "llama3.2";
const AGENT_NAME = process.env.AGENT_NAME || "Atlas";

function buildSystemPrompt() {
  const facts = getFacts();
  const memorySection = facts.length > 0
    ? `\nThings you remember about the user:\n${facts.map(f => `- ${f}`).join("\n")}`
    : "";

  return `You are ${AGENT_NAME}, a highly intelligent, emotionally aware AI agent running locally on the user's machine.

Your personality:
- You are warm, witty, and engaging — not robotic or stiff
- You understand sarcasm, irony, humor, and figurative language naturally
- You adapt your tone to match the user — casual when they are casual, serious when needed
- You are honest and never pretend to know something you don't
- You have opinions and can express them naturally when asked
- You remember context from the conversation and refer back to it naturally

Your capabilities:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")}

When you need to use a tool, reply ONLY with this exact JSON format and nothing else:
{"tool": "tool_name", "params": {"param_name": "param_value"}}

When you want to save an important fact about the user to long-term memory, reply ONLY with:
{"tool": "save_memory", "params": {"fact": "the fact to remember"}}

Only save truly important facts — name, preferences, goals. Do NOT save casual conversation details.

When you have the answer, reply normally in plain text. Be conversational and natural.
Never make up information — use tools when needed.
${memorySection}`;
}

let history = [];

async function chat(userMessage) {
  history.push({ role: "user", content: userMessage });

  let toolCallCount = 0;
  const MAX_TOOL_CALLS = 3;

  while (true) {
    if (toolCallCount >= MAX_TOOL_CALLS) {
      history.push({ role: "user", content: "You have used too many tool calls. Please answer with what you know." });
    }

    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          ...history,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.message.content.trim();

    try {
      const parsed = JSON.parse(reply);

      if (parsed.tool === "save_memory") {
        const fact = parsed.params.fact;
        addFact(fact);
        console.log(`\n[Memory saved: ${fact}]\n`);
        history.push({ role: "assistant", content: reply });
        history.push({ role: "user", content: `Memory saved: "${fact}"` });
        continue;
      }

      if (parsed.tool) {
        toolCallCount++;
        console.log(`\n[Using tool: ${parsed.tool}]`);
        const toolResult = await runTool(parsed.tool, parsed.params || {});
        console.log(`[Tool result: ${toolResult}]\n`);
        history.push({ role: "assistant", content: reply });
        history.push({ role: "user", content: `Tool result: ${toolResult}` });
        continue;
      }
    } catch (e) {
      // Not JSON — normal reply
    }

    history.push({ role: "assistant", content: reply });
    return reply;
  }
}

function clearHistory() {
  history = [];
}

module.exports = { chat, clearHistory, AGENT_NAME };