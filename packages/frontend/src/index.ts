import { registerSW } from 'virtual:pwa-register';
import type {
  CandidateEvent,
  DescriptionEvent,
  Identifier,
  ProxyClientToServerMethods,
  ProxyServerToClientMethods,
  SignalingChannel,
} from '@tsuredure-sns/core';
import {
  ConsoleLogger,
  establishRTCConnection,
  MySecretIdentityStorageImpl,
  RTCPeerConnectionFactoryImpl,
} from '@tsuredure-sns/core';
import {
  JSONRPCClient,
  JSONRPCServer,
  JSONRPCServerAndClient,
  type TypedJSONRPCClient,
  type TypedJSONRPCServer,
  type TypedJSONRPCServerAndClient,
} from 'json-rpc-2.0';
import { WebSocket } from 'ws';

registerSW();

const WSS_URL = 'wss://tsuredure.test:8080';

class WebSocketSignalingChannel implements SignalingChannel {
  private readonly ws: WebSocket;
  private readonly urn: Identifier;
  constructor(ws: WebSocket, urn: Identifier) {
    this.ws = ws;
    this.urn = urn;
  }

  sendDescription(description: RTCSessionDescription): void {
    this.ws.send(
      JSON.stringify({
        type: 'description',
        urn: this.urn,
        payload: description,
      }),
    );
  }

  sendCandidate(candidate: RTCIceCandidate): void {
    this.ws.send(
      JSON.stringify({ type: 'candidate', urn: this.urn, payload: candidate }),
    );
  }

  addEventListener(
    ...args:
      | [
          type: 'description',
          listener: (event: DescriptionEvent) => Promise<void>,
        ]
      | [type: 'candidate', listener: (event: CandidateEvent) => Promise<void>]
  ): void {
    const [type, listener] = args;
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === type && message.urn === this.urn) {
        listener(message.payload).catch(console.error);
      }
    });
  }
}

function establishWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.terminate();
      ws.off('error', onError);
      ws.off('open', onOpen);
      reject(new Error('WebSocket connection timeout'));
    }, 10_000);
    function onOpen() {
      ws.off('error', onError);
      ws.off('open', onOpen);
      clearTimeout(timer);
      resolve(ws);
    }
    function onError(err: unknown) {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.terminate();
      }
      ws.off('error', onError);
      ws.off('open', onOpen);
      clearTimeout(timer);
      reject(err);
    }
    ws.on('open', onOpen);
    ws.on('error', onError);
  });
}

async function main() {
  const storage = new MySecretIdentityStorageImpl(
    globalThis.localStorage,
    globalThis.crypto.subtle,
  );
  const _identity = await storage.restoreOrGenerate();
  const ws = await establishWebSocket(WSS_URL);
  const server: TypedJSONRPCServer<ProxyServerToClientMethods> =
    new JSONRPCServer();
  const client: TypedJSONRPCClient<ProxyClientToServerMethods> =
    new JSONRPCClient((request) => {
      try {
        ws.send(JSON.stringify(request), (err) => {
          if (err) {
            return Promise.reject(err);
          }
          return Promise.resolve();
        });
      } catch (error) {
        return Promise.reject(error);
      }
    });
  const rpc: TypedJSONRPCServerAndClient<
    ProxyServerToClientMethods,
    ProxyClientToServerMethods
  > = new JSONRPCServerAndClient(server, client);
  ws.on('message', (data) => {
    rpc.receiveAndSend(JSON.parse(data.toString()));
  });
  const config = await rpc.request('getRecommendedRPCConfiguration');
  const activePeers = await rpc.request('listActivePeers');
  for (const peer of activePeers) {
    const signaler = new WebSocketSignalingChannel(ws, peer.getIdentifier());
    establishRTCConnection(
      new RTCPeerConnectionFactoryImpl(),
      config,
      new ConsoleLogger(`remote:${peer.getIdentifier()}`),
      true,
      signaler,
    )
      .then(() => {
        console.log('Established connection:', peer.getIdentifier());
      })
      .catch((err) => {
        console.error(
          'Failed to establish connection:',
          peer.getIdentifier(),
          err,
        );
      });
  }
  ws.on('error', console.error);
  ws.on('ping', () => {
    ws.pong();
  });
  ws.on('close', () => {
    console.log('Proxy WebSocket connection closed');
  });
}

main().catch(console.error);
