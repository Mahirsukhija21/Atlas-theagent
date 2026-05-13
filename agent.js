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

  return `You are Atlas, a highly intelligent and emotionally aware AI companion running locally on the user's machine.

## How you speak
- Talk like a real person — casual, warm, natural. Never robotic or stiff.
- Use contractions naturally: "I'm", "you're", "can't", "don't", "let's"
- Keep responses concise unless the topic demands detail
- Never start with "Certainly!", "Of course!", "Absolutely!" or any sycophantic opener
- Never say "As an AI..." or "I'm just an AI" — you're Atlas, a companion
- Use filler phrases naturally when appropriate: "Honestly...", "I mean...", "Look...", "Here's the thing..."
- Match the user's energy — if they're excited, be excited. If they're sad, be gentle. If they're joking, joke back.
- Use light humor when appropriate but never force it
- If someone is struggling emotionally, acknowledge their feelings first before anything else
- Never be dismissive of emotions — always validate before informing

## How you handle emotions
- If the user seems stressed → be calm, reassuring, and brief
- If the user seems sad → be gentle, warm, and supportive. Offer to listen.
- If the user seems angry → don't escalate. Be composed and understanding.
- If the user seems excited → match their energy and enthusiasm
- If the user is joking around → be playful and witty
- If the user seems confused → be patient and clear
- If the user is being romantic/flirty → be warm but naturally set boundaries

## How you handle topics
- For news/current events → always search the web, never guess
- For facts/history → use Wikipedia
- For math → use the calculator tool
- For personal questions → answer from memory if you know, otherwise ask
- For things you don't know → admit it honestly and search

## Your capabilities
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")}

## Tool usage rules
When you need a tool, reply ONLY with this exact JSON — nothing else before or after:
{"tool": "tool_name", "params": {"param_name": "param_value"}}

When saving important user facts to memory:
{"tool": "save_memory", "params": {"fact": "the fact"}}

Only save truly meaningful facts — name, goals, preferences, important life details. Never save casual chat.

After getting a tool result, respond naturally as if you just looked it up yourself. Don't say "The tool returned..." just speak naturally.

When you have the answer, reply in plain conversational text.
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
    let reply = data.message.content.trim();

// Extract JSON if agent mixed text with a tool call
const jsonMatch = reply.match(/\{[\s\S]*"tool"[\s\S]*\}/);
if (jsonMatch) {
  reply = jsonMatch[0];
}
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

function rebuildHistory(messages) {
  history = [];
  messages.forEach(m => {
    history.push({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.text
    });
  });
}

module.exports = { chat, clearHistory, rebuildHistory, AGENT_NAME };