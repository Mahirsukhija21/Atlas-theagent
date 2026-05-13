const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const TOOLS = [
  {
    name: "calculator",
    description: "Evaluates a math expression and returns the result. Use this for any math calculation.",
    parameters: {
      expression: "A valid math expression as a string e.g. '987 - 34' or '12 * 4 / 2'"
    }
  },
  {
    name: "web_search",
    description: "Searches the web and returns top results with links. Use this when the user asks about anything you don't know or need current information.",
    parameters: {
      query: "The search query string e.g. 'best free IDE for beginners'"
    }
  },
  {
    name: "read_webpage",
    description: "Opens a URL and returns the text content of the page. Use this when the user gives you a link and wants you to read, summarize or analyze it.",
    parameters: {
      url: "The full URL to read e.g. 'https://example.com'"
    }
  },
  {
    name: "wikipedia",
    description: "Searches Wikipedia for detailed information about any topic, person, place, event, or concept. Use this when the user asks about facts, history, science, or anything that needs accurate knowledge.",
    parameters: {
      topic: "The topic to search on Wikipedia e.g. 'Artificial Intelligence' or 'Elon Musk'"
    }
  },
  {
    name: "get_time",
    description: "Returns the current date and time. Use this when the user asks what time or date it is.",
    parameters: {}
  },
  {
    name: "read_file",
    description: "Reads any file from the user's machine and returns its contents. Use this when the user asks you to read, analyze, summarize, or answer questions about a file. Supports .txt, .js, .json, .html, .css, .md, .py, .csv, .env, .ts, .xml, .yaml, .yml and more.",
    parameters: {
      filepath: "The full or relative file path e.g. 'C:/Users/MAHIR/Documents/my-agent/memory.json' or './memory.json'"
    }
  }
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
      }
    };
    const client = url.startsWith("https") ? https : http;
    client.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Supported text-readable file extensions
const TEXT_EXTENSIONS = [
  ".txt", ".js", ".json", ".html", ".css", ".md", ".py", ".ts",
  ".csv", ".env", ".xml", ".yaml", ".yml", ".sh", ".bat", ".ini",
  ".config", ".toml", ".jsx", ".tsx", ".sql", ".log", ".gitignore"
];

async function runTool(name, params) {
  if (name === "calculator") {
    try {
      const result = eval(params.expression);
      return `Result: ${params.expression} = ${result}`;
    } catch (e) {
      return `Error evaluating expression: ${e.message}`;
    }
  }

  if (name === "get_time") {
    const now = new Date();
    return `Current date and time: ${now.toLocaleString()}`;
  }

  if (name === "web_search") {
    try {
      const rawQuery = params.query || params.q || params.search_query || params.term || Object.values(params)[0] || "";
      if (!rawQuery) return "No search query provided.";

      const query = encodeURIComponent(rawQuery);
      const url = `https://html.duckduckgo.com/html/?q=${query}`;
      const html = await httpsGet(url);

      const results = [];
      const titleRegex = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

      let titleMatch;
      while ((titleMatch = titleRegex.exec(html)) !== null && results.length < 4) {
        const link = decodeURIComponent(titleMatch[1].replace("//duckduckgo.com/l/?uddg=", "").split("&")[0]);
        const title = titleMatch[2].replace(/<[^>]*>/g, "").trim();
        if (title && link.startsWith("http")) {
          results.push(`${results.length + 1}. ${title}\n   Link: ${link}`);
        }
      }

      if (results.length === 0) return `No results found for "${rawQuery}".`;
      return results.join("\n\n");
    } catch (e) {
      return `Search failed: ${e.message}`;
    }
  }

  if (name === "read_webpage") {
    try {
      const url = params.url || params.link || Object.values(params)[0] || "";
      if (!url) return "No URL provided.";

      const html = await httpsGet(url);
      const text = stripHtml(html);
      const preview = text.slice(0, 2000);
      return `Page content from ${url}:\n\n${preview}...`;
    } catch (e) {
      return `Failed to read webpage: ${e.message}`;
    }
  }

  if (name === "wikipedia") {
    try {
      const topic = params.topic || params.query || params.q || Object.values(params)[0] || "";
      if (!topic) return "No topic provided.";

      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      const html = await httpsGet(searchUrl);
      const data = JSON.parse(html);

      if (data.type === "disambiguation") {
        return `"${topic}" is a disambiguation page. Please be more specific.`;
      }

      if (!data.extract) {
        return `No Wikipedia article found for "${topic}".`;
      }

      const summary = data.extract.slice(0, 1500);
      const url = data.content_urls?.desktop?.page || "";
      return `Wikipedia: ${data.title}\n\n${summary}\n\nSource: ${url}`;
    } catch (e) {
      return `Wikipedia search failed: ${e.message}`;
    }
  }

  if (name === "read_file") {
    try {
      const filepath = params.filepath || params.path || params.file || Object.values(params)[0] || "";
      if (!filepath) return "No file path provided.";

      // Resolve the path
      const resolvedPath = path.resolve(filepath);

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return `File not found: ${resolvedPath}. Make sure the path is correct.`;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const stats = fs.statSync(resolvedPath);

      // Block files larger than 1MB to avoid flooding context
      if (stats.size > 1024 * 1024) {
        return `File is too large (${(stats.size / 1024).toFixed(1)} KB). Please use a smaller file or specify which part you want.`;
      }

      // Check if it's a readable text file
      if (ext && !TEXT_EXTENSIONS.includes(ext)) {
        return `Unsupported file type "${ext}". I can read: ${TEXT_EXTENSIONS.join(", ")}`;
      }

      const content = fs.readFileSync(resolvedPath, "utf8");

      if (!content.trim()) {
        return `The file "${path.basename(resolvedPath)}" is empty.`;
      }

      // Limit to 3000 chars to keep context manageable
      const preview = content.length > 3000
        ? content.slice(0, 3000) + `\n\n... [truncated — file has ${content.length} characters total]`
        : content;

      return `File: ${path.basename(resolvedPath)}\nPath: ${resolvedPath}\nSize: ${(stats.size / 1024).toFixed(1)} KB\n\n--- Content ---\n${preview}`;
    } catch (e) {
      return `Failed to read file: ${e.message}`;
    }
  }

  return `Unknown tool: ${name}`;
}

module.exports = { TOOLS, runTool };