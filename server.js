const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const dotenv = require("dotenv");
dotenv.config();

const { chat, clearHistory, rebuildHistory, AGENT_NAME } = require("./agent.js");
const { clearMemory, getFacts } = require("./memory.js");

const app = express();
const PORT = 5000;
const CHATS_FILE = path.join(__dirname, "chats.json");
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── HELPERS ───────────────────────────────────────────────
function loadChats() {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      return JSON.parse(fs.readFileSync(CHATS_FILE, "utf8"));
    }
  } catch (e) {}
  return [];
}

function saveChats(chats) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2), "utf8");
}

// ── CHAT ENDPOINTS ────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });
  try {
    const reply = await chat(message);
    res.json({ reply, agent: AGENT_NAME });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/clear", (req, res) => {
  clearHistory();
  res.json({ success: true });
});

app.post("/retry", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });
  try {
    clearHistory();
    const reply = await chat(message);
    res.json({ reply, agent: AGENT_NAME });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/rewind", async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });
  try {
    clearHistory();
    rebuildHistory(history || []);
    const reply = await chat(message);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/clearmemory", (req, res) => {
  clearMemory();
  res.json({ success: true });
});

app.get("/memory", (req, res) => {
  res.json({ facts: getFacts() });
});

// ── HISTORY ENDPOINTS ─────────────────────────────────────
app.get("/chats", (req, res) => {
  const chats = loadChats();
  const summary = chats.map(c => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt
  })).reverse();
  res.json({ chats: summary });
});

app.get("/chats/:id", (req, res) => {
  const chats = loadChats();
  const chat = chats.find(c => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: "Chat not found" });
  res.json(chat);
});

app.delete("/chats/:id", (req, res) => {
  let chats = loadChats();
  chats = chats.filter(c => c.id !== req.params.id);
  saveChats(chats);
  res.json({ success: true });
});

app.post("/savechat", (req, res) => {
  const { id, messages } = req.body;
  if (!id || !messages || messages.length === 0) return res.json({ success: false });

  let chats = loadChats();
  const existing = chats.findIndex(c => c.id === id);
  const firstUserMsg = messages.find(m => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.text.slice(0, 40) + (firstUserMsg.text.length > 40 ? "..." : "")
    : "New chat";

  if (existing !== -1) {
    chats[existing].messages = messages;
    chats[existing].title = title;
  } else {
    chats.push({ id, title, messages, createdAt: new Date().toISOString() });
  }

  saveChats(chats);
  res.json({ success: true });
});

// ── IMAGE UPLOAD ──────────────────────────────────────────
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const prompt = req.body.prompt || "Describe this image in detail.";
    const imageBase64 = req.file.buffer.toString("base64");

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llava",
        messages: [{ role: "user", content: prompt, images: [imageBase64] }],
        stream: false
      })
    });

    if (!response.ok) throw new Error("LLaVA model not available. Run: ollama pull llava");
    const data = await response.json();
    res.json({ reply: data.message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── START ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖  ${AGENT_NAME} is running!`);
  console.log(`    Open http://localhost:${PORT} in your browser\n`);
});