import { registerSW } from 'virtual:pwa-register';
import type {
  CandidateEvent,
  DescriptionEvent,
  Identifier,
  SignalingChannel,
} from '@tsuredure-sns/core';
import { SignalingRPCClientImpl } from '@tsuredure-sns/core';

registerSW();

const WSS_URL = 'wss://localhost:3000/ws';

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
    this.ws.addEventListener('message', (data) => {
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
      ws.close(1, 'Connection timeout');
      ws.removeEventListener('error', onError);
      ws.removeEventListener('open', onOpen);
      reject(new Error('WebSocket connection timeout'));
    }, 10_000);
    function onOpen() {
      ws.removeEventListener('error', onError);
      ws.removeEventListener('open', onOpen);
      clearTimeout(timer);
      resolve(ws);
    }
    function onError(err: unknown) {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.close(2, 'Client error');
      }
      ws.removeEventListener('error', onError);
      ws.removeEventListener('open', onOpen);
      clearTimeout(timer);
      reject(err);
    }
    ws.addEventListener('open', onOpen);
    ws.addEventListener('error', onError);
  });
}

async function main() {
  // const storage = new MySecretIdentityStorageImpl(
  //   globalThis.localStorage,
  //   globalThis.crypto.subtle,
  // );
  // const _identity = await storage.restoreOrGenerate();
  const ws = await establishWebSocket(WSS_URL);
  ws.addEventListener('message', (ev) => {
    console.log('Received message:', ev.data);
    rpc.onReceive(ev.data.toString());
  });
  const rpc = new SignalingRPCClientImpl((jsonRPCRequest: unknown) => {
    console.log('Sending message:', jsonRPCRequest);
    ws.send(JSON.stringify(jsonRPCRequest));
  });

  const rpcConfiguration = await rpc.getRecommendedRPCConfiguration();
  console.log('RPC Configuration:', rpcConfiguration);
}

main().catch(console.error);
