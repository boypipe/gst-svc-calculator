// Simple local proxy for Bill Splitter AI receipt scanning
// This lets the HTML page call Anthropic's API without CORS issues
//
// Requirements: Node.js (https://nodejs.org)
//
// Usage:
//   node proxy.js
//
// Then open http://localhost:3000/bill_splitter.html in your browser.
// Put bill_splitter.html in the same folder as this file.

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const server = http.createServer((req, res) => {
  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, anthropic-version");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy Anthropic API calls
  if (req.method === "POST" && req.url === "/v1/messages") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      const apiKey = req.headers["x-api-key"] || "";
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
        proxyRes.pipe(res);
      });

      proxyReq.on("error", err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Serve static files from the same directory
  let filePath = "." + req.url;
  if (filePath === "./") filePath = "./bill_splitter.html";

  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css"
  };
  const contentType = mimeTypes[ext] || "text/plain";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Bill Splitter running at http://localhost:${PORT}/bill_splitter.html\n`);
  console.log("Press Ctrl+C to stop.\n");
});
