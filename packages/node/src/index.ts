import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { createApp } from '@tsuredure-sns/core-server';
import { Hono } from 'hono';

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({
  app,
});
const wsApp = createApp(upgradeWebSocket);

app.route('/', wsApp);

const server = serve(
  {
    fetch: app.fetch,
    createServer,
    serverOptions: {
      cert: readFileSync(`${import.meta.dirname}/../../../cert.pem`),
      key: readFileSync(`${import.meta.dirname}/../../../key.pem`),
    },
    hostname: '0.0.0.0',
    port: 3000,
  },
  (info) => {
    console.log(`Server started`, info);
  },
);
server.on('listening', () => {
  console.log('Listening on https://localhost:3000');
});
server.addListener('close', () => {
  console.log('Server closed');
});
server.on('error', (err) => {
  console.error('Server error:', err);
});

injectWebSocket(server);
