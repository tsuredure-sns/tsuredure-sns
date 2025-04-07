import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { WebSocket, WebSocketServer } from 'ws';

const server = createServer({
  cert: readFileSync(`${import.meta.dirname}/../../../cert.pem`),
  key: readFileSync(`${import.meta.dirname}/../../../key.pem`),
});
const wss = new WebSocketServer({ server });

const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: 'stun:ice.cafe-capy.net:3478',
  },
];

// keep-alive
wss.on('connection', (ws) => {
  let isAlive = true;
  ws.on('pong', () => {
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

  wss.on('close', () => {
    clearInterval(interval);
  });
});

const connectionMap = new Map<string, WebSocket>();

wss.on('connection', (ws) => {
  ws.on('error', console.error);
  const urn = crypto.randomUUID();
  connectionMap.set(urn, ws);
  ws.on('close', () => {
    connectionMap.delete(urn);
  });

  ws.send(
    JSON.stringify({
      type: 'seed',
      payload: {
        urn,
        iceServers: ICE_SERVERS,
      },
    }),
  );

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    switch (message.type) {
      case 'description':
        sendMessageTo(data.toString(), false, message.to);
        break;
      case 'candidate':
        sendMessageTo(data.toString(), false, message.to);
        break;
      case 'broadcast':
        broadcastMessage(data.toString(), false);
        break;
      case 'binary':
        sendMessageTo(data.toString(), true, message.to);
        break;
    }
  });

  function broadcastMessage(data: string, binary: boolean): void {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary });
      }
    }
  }

  function sendMessageTo(data: string, binary: boolean, id: string): void {
    const target = connectionMap.get(id);
    if (!target) {
      return;
    }
    target.send(data, { binary });
  }
});

server.listen(8080);
