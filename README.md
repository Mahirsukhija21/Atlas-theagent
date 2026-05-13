# Atlas — Cloud Version

> A smart, emotionally aware AI companion powered by Groq & LLaMA 3.3 70B — accessible from anywhere on the web.

---

## What is Atlas?

Atlas is a personal AI agent that runs in the cloud. It can search the web, do math, look up Wikipedia, remember things about you, and hold natural conversations — all from a clean, minimal interface.

This is the **cloud branch** of Atlas, powered by [Groq](https://groq.com) for fast, free inference. For the local version (runs on your machine via Ollama), see the `main` branch.

---

## Features

- 🧠 **LLaMA 3.3 70B** via Groq — fast, smart, free
- 🔍 **Web search** — searches DuckDuckGo for current info
- 📖 **Wikipedia** — instant knowledge lookup
- 🧮 **Calculator** — evaluates any math expression
- 💾 **Memory** — remembers facts about you across conversations
- 🕐 **Time awareness** — knows the current date and time
- 💬 **Chat history** — saves and loads past conversations
- ↺ **Retry** — regenerate any response
- ↩ **Rewind** — jump back to any point in the conversation
- 🔊 **Voice** — text-to-speech for agent responses
- 📎 **File & image support** — attach files or images to your messages

---

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | HTML, CSS, JS       |
| Backend  | Node.js, Express    |
| AI       | Groq API (LLaMA 3.3 70B) |
| Hosting  | Railway             |

---

## Getting Started

### 1. Clone the repo (cloud branch)

```bash
git clone -b cloud https://github.com/Mahirsukhija21/Atlas-theagent.git
cd Atlas-theagent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your `.env`

Create a `.env` file in the root:

```env
GROQ_API_KEY=your_groq_api_key_here
MODEL=llama-3.3-70b-versatile
AGENT_NAME=Atlas
```

Get a free Groq API key at [console.groq.com](https://console.groq.com)

### 4. Run locally

```bash
node server.js
```

Open `http://localhost:4000` in your browser.

---

## Deployment (Railway)

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repo and select the `cloud` branch
3. Add your environment variables in Railway's dashboard
4. Deploy — Railway will give you a public URL automatically

---

## Environment Variables

| Variable       | Description                        | Required |
|----------------|------------------------------------|----------|
| `GROQ_API_KEY` | Your Groq API key                  | ✅       |
| `MODEL`        | Groq model to use                  | ✅       |
| `AGENT_NAME`   | Name of the agent (default: Atlas) | ❌       |

---

## Branches

| Branch  | Description                              |
|---------|------------------------------------------|
| `main`  | Local version — runs via Ollama          |
| `cloud` | This branch — runs via Groq API          |

---

## License

MIT — free to use, modify, and deploy.

---

*Built by [Mahirsukhija21](https://github.com/Mahirsukhija21)*