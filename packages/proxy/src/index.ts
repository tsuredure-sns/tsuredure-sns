import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";

const server = createServer({
  cert: readFileSync(`${import.meta.dirname}/../localhost.pem`),
  key: readFileSync(`${import.meta.dirname}/../localhost-key.pem`),
});
const wss = new WebSocketServer({ server });

// keep-alive
wss.on("connection", (ws) => {
  let isAlive = true;
  ws.on("pong", () => {
    isAlive = true;
  });
  const interval = setInterval(() => {
    if (isAlive === false || ws.readyState !== WebSocket.OPEN) {
      ws.terminate();
      clearInterval(interval);
      return;
    }
    isAlive = false;
    ws.ping();
  }, 30_000);

  wss.on("close", () => {
    clearInterval(interval);
  });
});

let connectionId = 0;
const connectionMap = new Map<number, WebSocket>();

wss.on("connection", (ws) => {
  ws.on("error", console.error);
  const id = connectionId++;
  connectionMap.set(id, ws);
  ws.on("close", () => {
    connectionMap.delete(id);
  });

  ws.send(JSON.stringify({
    type: "initial",
    payload: {
      id,
      connectionCount: connectionMap.size,
    },
  }));

  function broadcastMessage(data: string, binary: boolean): void {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary });
      }
    });
  }

  function sendMessageTo(data: string, binary: boolean, id: number): void {
    const target = connectionMap.get(id);
    if (!target) {
      return;
    }
    target.send(data, { binary });
  }

  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("initial"),
      payload: z.object({
        id: z.number(),
        connectionCount: z.number(),
      }),
    }),
    z.object({
      type: z.literal("offer"),
      payload: z.string()
    }),
    z.object({
      type: z.literal("answer"),
      payload: z.string(),
    }),
    z.object({
      type: z.literal("candidate"),
      payload: z.string(),
    }),
  ]);

  ws.on("message", (data, binary) => {
    console.log("received: %s", data);
    try {
      const message = schema.parse(JSON.parse(data.toString()) as unknown);
      switch (message.type) {
        case "offer":
        case "candidate": {
          broadcastMessage(data.toString(), binary);
          break;
        }
        case "answer": {
          break;
        }
      }
      if ('type' in message) {
        switch (message.type) {
          case "offer":
            broadcastMessage(data.toString(), binary);
            break;
          case "answer":
          case "candidate":
            if ('targetId' in message) {
              sendMessageTo(data.toString(), binary, message.targetId as number);
            }
            break;
        }
      }
    } catch (err) {
      console.error("Failed to parse message", err);
      return;
    }
  });
});

server.listen(8080);
