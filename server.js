const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { chat, clearHistory, AGENT_NAME } = require("./agent.js");
const { clearMemory, getFacts } = require("./memory.js");

const app = express();
const PORT = 4000;
const upload = multer({ dest: "uploads/" });
const CHATS_DIR = path.join(__dirname, "chats");

// create chats folder if it doesn't exist
if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── CHAT ──────────────────────────────────────────────────────
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

// ── IMAGE UPLOAD ──────────────────────────────────────────────
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const prompt = req.body.prompt || "Describe this image in detail.";
    const imageData = fs.readFileSync(imagePath).toString("base64");

    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "moondream",
        prompt: prompt,
        images: [imageData],
        stream: false
      })
    });

    const ollamaData = await ollamaRes.json();
    fs.unlinkSync(imagePath);

    const description = ollamaData.response;
    const reply = await chat(
      `The user sent an image. A vision AI already analyzed it and produced this description:\n\n"${description}"\n\nUsing ONLY this description, respond to the user's request: "${prompt}". Do NOT say you cannot see images.`
    );

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SAVE CHAT ─────────────────────────────────────────────────
// receives the full chat messages array from the browser and saves to a file
app.post("/savechat", (req, res) => {
  try {
    const { id, messages } = req.body;
    if (!messages || messages.length === 0) return res.json({ success: false });

    const title = messages[0].text.slice(0, 60); // first message as title
    const chat_data = {
      id,
      title,
      createdAt: new Date().toISOString(),
      messages
    };

    fs.writeFileSync(
      path.join(CHATS_DIR, `${id}.json`),
      JSON.stringify(chat_data, null, 2)
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LIST CHATS ────────────────────────────────────────────────
// reads all json files from chats/ and returns them sorted by newest first
app.get("/chats", (req, res) => {
  try {
    const files = fs.readdirSync(CHATS_DIR).filter(f => f.endsWith(".json"));
    const chats = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(CHATS_DIR, file)));
      return { id: data.id, title: data.title, createdAt: data.createdAt };
    });

    // newest first
    chats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ chats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LOAD CHAT ─────────────────────────────────────────────────
// returns a single chat's full messages by id
app.get("/chats/:id", (req, res) => {
  try {
    const filePath = path.join(CHATS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Chat not found" });
    const data = JSON.parse(fs.readFileSync(filePath));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE CHAT ───────────────────────────────────────────────
app.delete("/chats/:id", (req, res) => {
  try {
    const filePath = path.join(CHATS_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CLEAR / MEMORY ────────────────────────────────────────────
app.post("/clear", (req, res) => {
  clearHistory();
  res.json({ success: true });
});

app.post("/clearmemory", (req, res) => {
  clearMemory();
  res.json({ success: true });
});

app.get("/memory", (req, res) => {
  res.json({ facts: getFacts() });
});

app.listen(PORT, () => {
  console.log(`\n🤖  ${AGENT_NAME} server running!`);
  console.log(`    Open http://localhost:${PORT} in your browser\n`);
});