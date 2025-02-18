import express from "express";
import fs from "fs";
import http from "http";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "echo",
          
        }),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Create an HTTP server so we can attach a WebSocket server
const server = http.createServer(app);

// Set up a WebSocket server to broadcast push-to-talk events
const wss = new WebSocketServer({ server });
function broadcastPushToTalkEvent(event) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ event }));
    }
  });
}

// Endpoint for push-to-talk from Python
app.get("/push-to-talk", (req, res) => {
  const state = req.query.state;
  if (state === "1") {
    console.log("Push-to-talk START received from Python");
    broadcastPushToTalkEvent("pushToTalkStart");
  } else if (state === "0") {
    console.log("Push-to-talk STOP received from Python");
    broadcastPushToTalkEvent("pushToTalkStop");
  } else {
    console.log("Unknown state received:", state);
  }
  res.send("OK");
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;
  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8")
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

server.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
