import {
  type SignalingRPCServer,
  SignalingRPCServerImpl,
} from '@tsuredure-sns/core';
import { Hono } from 'hono';
import type { UpgradeWebSocket } from 'hono/ws';

export function createApp(upgradeWebSocketAdapter: UpgradeWebSocket) {
  let rpc: SignalingRPCServer;
  const app = new Hono();

  enum State {
    INITIAL = 0,
    INITIALIZED = 1,
  }

  interface Storage {
    state: State;
    rpc?: SignalingRPCServer;
    [key: string]: unknown;
  }

  const storage = new Map<string, Storage>();

  async function broadcastOffer(
    fromId: string,
    description: RTCSessionDescriptionInit,
  ) {
    const answers = [];
    for (const [key, value] of storage.entries()) {
      if (key !== fromId && value.state === State.INITIALIZED && value.rpc) {
        const result = await value.rpc.sendOffer({ fromId, description });
        if (result.toId === fromId) {
          answers.push({
            fromId: key,
            description: result.description,
          });
        }
      }
    }
    return answers;
  }

  app.get('/', (c) => c.text('Hello from core-server!'));

  app.get(
    '/ws',
    upgradeWebSocketAdapter(
      () => {
        const userToken = globalThis.crypto.randomUUID();
        console.log(`New connection: ${userToken}`);
        storage.set(userToken, {
          state: State.INITIAL,
        });

        return {
          onMessage: (event, ws) => {
            if (!rpc) {
              rpc = new SignalingRPCServerImpl(
                (server) => {
                  server.addMethod(
                    'getRecommendedRPCConfiguration',
                    async () => {
                      return {
                        iceServers: [
                          {
                            urls: [
                              'stun:stun.l.google.com:19302',
                              'stun:stun.l.google.com:19305',
                              'stun:stun1.l.google.com:19302',
                              'stun:stun2.l.google.com:19302',
                              'stun:stun3.l.google.com:19302',
                              'stun:stun4.l.google.com:19302',
                              'stun:stun.cloudflare.com:3478',
                              'stun:stun.cloudflare.com:53',
                            ],
                          },
                        ],
                      };
                    },
                  );
                  server.addMethod(
                    'broadcastOffer',
                    async ({ description }) => {
                      return broadcastOffer(userToken, description);
                    },
                  );
                  server.addMethod(
                    'sendCandidateTo',
                    async ({ candidate, toId }) => {
                      const target = storage.get(toId);
                      if (
                        target &&
                        target.state === State.INITIALIZED &&
                        userToken === toId
                      ) {
                        target.rpc?.sendCandidateTo({
                          candidate,
                          toId,
                        });
                      }
                    },
                  );
                },
                (jsonRPCResponse: unknown) => {
                  ws.send(JSON.stringify(jsonRPCResponse));
                },
              );
              storage.set(userToken, {
                state: State.INITIALIZED,
                rpc,
              });
            }
            console.log(`Message from ${userToken}: ${event.data}`);
            rpc.onReceive(event.data.toString());
          },
          onError(evt, ws) {
            console.error('WebSocket error observed:', evt, ws);
          },
          onClose(evt) {
            console.log('WebSocket is closed now.', evt);
            rpc?.terminate();
            storage.delete(userToken);
          },
        };
      },
      {
        onError: (err) => {
          console.error(err);
        },
      },
    ),
  );

  return app;
}
