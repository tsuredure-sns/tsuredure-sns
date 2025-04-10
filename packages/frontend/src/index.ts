import { registerSW } from 'virtual:pwa-register';
import { WebSocket } from 'ws';
import { establishRTCConnection } from '@tsuredure-sns/core/establishRTCConnection';
import { ConsoleLogger } from '@tsuredure-sns/core/logger';
import type {
  CandidateEvent,
  DescriptionEvent,
  Identifier,
  ProxyClientToServerMethods,
  ProxyServerToClientMethods,
  SignalingChannel,
} from '@tsuredure-sns/types';
import {
  generateNewSecret,
  MySecretIdentityStorageImpl,
} from '@tsuredure-sns/core/mySecretIdentity';
import {
  JSONRPCClient,
  JSONRPCServer,
  JSONRPCServerAndClient,
  TypedJSONRPCClient,
  TypedJSONRPCServer,
  TypedJSONRPCServerAndClient,
} from 'json-rpc-2.0';

registerSW();

const WSS_URL = 'wss://tsuredure.test:8080';

class WebSocketSignalingChannel implements SignalingChannel {
  constructor(
    private readonly ws: WebSocket,
    private readonly urn: Identifier,
  ) {}

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

async function establishWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => {
      resolve(ws);
    });
    ws.on('error', (err) => {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.terminate();
      }
      reject(err);
    });
    setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connection timeout'));
    }, 10_000);
  });
}

async function main() {
  const storage = new MySecretIdentityStorageImpl(
    window.crypto.randomUUID,
    window.localStorage,
    window.crypto.subtle,
  );
  const identity = await storage.restoreOrGenerate();
  const ws = await establishWebSocket(WSS_URL);
  const server: TypedJSONRPCServer<ProxyServerToClientMethods> = new JSONRPCServer();
  const client: TypedJSONRPCClient<ProxyClientToServerMethods> = new JSONRPCClient((request) => {
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
      config,
      new ConsoleLogger(`remote:${peer.getIdentifier()}`),
      true,
      signaler,
    )
      .then(() => {
        console.log('Established connection:', peer.getIdentifier());
      })
      .catch((err) => {
        console.error('Failed to establish connection:', peer.getIdentifier(), err);
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

// function testRTCConnectionOnLocal() {
//   const localLogger = new ConsoleLogger('local');
//   const remoteLogger = new ConsoleLogger('remote');
//   const localIsPolite = true;
//   const remoteIsPolite = false;
//   const localSignal = new LocalSignalHandler();
//   const remoteSignal = new LocalSignalHandler();
//   localSignal.setTarget(remoteSignal);
//   remoteSignal.setTarget(localSignal);

//   const iceServers = [
//     {
//       urls: 'stun:stun1.l.google.com:19302',
//     },
//     {
//       urls: 'stun:stun2.l.google.com:19302',
//     },
//     {
//       urls: 'stun:stun3.l.google.com:19302',
//     },
//     {
//       urls: 'stun:stun4.l.google.com:19302',
//     },
//     {
//       urls: 'stun:stun.l.google.com:19302',
//     },
//   ];
//   const localConnection = establishRTCConnection(
//     iceServers,
//     localLogger,
//     localIsPolite,
//     remoteSignal,
//   );
//   const remoteConnection = establishRTCConnection(
//     iceServers,
//     remoteLogger,
//     remoteIsPolite,
//     localSignal,
//   );

//   window.addEventListener(
//     'beforeunload',
//     () => {
//       if (localConnection.dataChannel.readyState === 'open') {
//         localConnection.dataChannel.close();
//       }
//       if (localConnection.pc.connectionState !== 'closed') {
//         localConnection.pc.close();
//       }
//       if (remoteConnection.dataChannel.readyState === 'open') {
//         remoteConnection.dataChannel.close();
//       }
//       if (remoteConnection.pc.connectionState !== 'closed') {
//         remoteConnection.pc.close();
//       }
//     },
//     { once: true },
//   );
// }
