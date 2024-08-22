import { registerSW } from "virtual:pwa-register";
import { WebSocket } from "ws";
import { z } from "zod";

registerSW();

interface SignalingHandlerInterface extends EventTarget {
  sendDescription(description: RTCSessionDescription): Promise<void>;
  sendCandidate(candidate: RTCIceCandidate): Promise<void>;
}

class DescriptionEvent extends Event {
  constructor(
    public readonly description: RTCSessionDescription,
    public readonly connectionId: number,
  ) {
    super("description");
  }
}

class CandidateEvent extends Event {
  constructor(
    public readonly candidate: RTCIceCandidate,
    public readonly connectionId: number,
  ) {
    super("candidate");
  }
}

class LocalSinalHandler extends EventTarget implements SignalingHandlerInterface {
  private target?: EventTarget = null;
  public setTarget(target: EventTarget) {
    this.target = target;
  }

  public async sendDescription(description: RTCSessionDescription) {
    return new Promise<void>((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        this.target?.dispatchEvent(new DescriptionEvent(description, 0));
        resolve();
      }, 10);
    });
  }
  public async sendCandidate(candidate: RTCIceCandidate): Promise<void> {
    // Simulate network delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.target?.dispatchEvent(new CandidateEvent(candidate, 0));
        resolve();
      }, 50);
    });
  }
}

class WebSocketSignalHandler extends EventTarget implements SignalingHandlerInterface {
  public constructor(private readonly ws: WebSocket) {
    super();
  }

  public async sendDescription(description: RTCSessionDescription): Promise<void> {
    if (description.type === "offer") {
      this.ws.send(JSON.stringify({
        type: "offer",
        payload: JSON.stringify(description.toJSON()),
      }));
    } else if (description.type === "answer") {
      this.ws.send(JSON.stringify({
        type: "answer",
        payload: JSON.stringify(description.toJSON()),
      }));
    }
  }

  public async sendCandidate(candidate: RTCIceCandidate): Promise<void {
    this.ws.send(JSON.stringify({
      type: "candidate",
      payload: JSON.stringify(candidate.toJSON()),
    }));
  }
}

interface Logger {
  log(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
}

class ConsoleLogger implements Logger {
  constructor(private readonly id: string) {}
  public log(...args: any[]) {
    console.log(`[${this.id}]`, ...args);
  }
  public error(...args: any[]) {
    console.error(`[${this.id}]`, ...args);
  }
  public debug(...args: any[]) {
    console.debug(`[${this.id}]`, ...args);
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
 */
function establishRTCConnection(
  iceServers: RTCIceServer[],
  logger: Logger,
  polite: boolean,
  signal: SignalingHandlerInterface,
) {
  const pc = new RTCPeerConnection({
    iceServers,
  });
  let makingOffer = false;
  let ignoreOffer = false;

  const dataChannel = pc.createDataChannel("dataChannel");
  dataChannel.addEventListener("open", () => {
    logger.debug("Data channel opened!!!");
    dataChannel.send("Hello world");
  });
  pc.addEventListener("datachannel", (event) => {
    event.channel.addEventListener("message", (message) => {
      logger.debug("Received message", message.data);
    });
    event.channel.addEventListener("error", (err) => {
      logger.error("Data channel error", err);
    });
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    logger.debug("ICE connection state changed", pc.iceConnectionState);
    if (pc.iceConnectionState === "failed") {
      logger.log("restart ice");
      pc.restartIce();
    }
  });
  pc.addEventListener("icecandidateerror", (event) => {
    logger.error("ICE candidate error", event.errorCode, event.url, event.errorText);
  });
  pc.addEventListener("connectionstatechange", () => {
    logger.debug("Connection state changed", pc.connectionState);
  });
  pc.addEventListener("signalingstatechange", () => {
    logger.debug("Signaling state changed", pc.signalingState);
  });
  pc.addEventListener("icegatheringstatechange", () => {
    logger.debug("ICE gathering state changed", pc.iceGatheringState);
  });
  pc.addEventListener("icecandidate", async ({ candidate }) => {
    logger.debug("Got ice candidate");
    await signal.sendCandidate(candidate);
  });
  pc.addEventListener("negotiationneeded", async () => {
    logger.debug("Negotiation needed");
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      logger.log("Created offer");
      if (!pc.localDescription) {
        throw new Error("No local description");
      }
      await signal.sendDescription(pc.localDescription);
    } catch (err) {
      logger.error("Failed to create offer", err);
    } finally {
      makingOffer = false;
    }
  });
  signal.addEventListener("description", async ({ description }: DescriptionEvent) => {
    try {
      logger.debug("Got description", description.type);
      const isOffer = description.type === "offer";
      const offerCollision = isOffer && (makingOffer || pc.signalingState !== "stable");
      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) {
        logger.log("Ignoring offer");
        return;
      }
      logger.debug("Set remote description");
      await pc.setRemoteDescription(description);
      if (isOffer) {
        await pc.setLocalDescription();
        if (!pc.localDescription) {
          throw new Error("No local description");
        }
        logger.debug("Answer was created");
        await signal.sendDescription(pc.localDescription);
      }
    } catch (err) {
      logger.error(err);
    }
  });
  signal.addEventListener("candidate", async ({ candidate }: CandidateEvent) => {
    try {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        if (!ignoreOffer) {
          throw err;
        }
      }
    } catch (e) {
      logger.error(e);
    }
  });

  return {
    pc,
    dataChannel,
  };
}

function testRTCConnectionOnLocal() {
  const localLogger = new ConsoleLogger("local");
  const remoteLogger = new ConsoleLogger("remote");
  const localIsPolite = true;
  const remoteIsPolite = false;
  const localSignal = new LocalSinalHandler();
  const remoteSignal = new LocalSinalHandler();
  localSignal.setTarget(remoteSignal);
  remoteSignal.setTarget(localSignal);

  const iceServers = [
    {
      urls: "stun:stun1.l.google.com:19302",
    },
    {
      urls: "stun:stun2.l.google.com:19302",
    },
    {
      urls: "stun:stun3.l.google.com:19302",
    },
    {
      urls: "stun:stun4.l.google.com:19302",
    },
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ];
  const localConnection = establishRTCConnection(iceServers, localLogger, localIsPolite, remoteSignal);
  const remoteConnection = establishRTCConnection(iceServers, remoteLogger, remoteIsPolite, localSignal);

  window.addEventListener("beforeunload", () => {
    if (localConnection.dataChannel.readyState === "open") {
      localConnection.dataChannel.close();
    }
    if (localConnection.pc.connectionState !== "closed") {
      localConnection.pc.close();
    }
    if (remoteConnection.dataChannel.readyState === "open") {
      remoteConnection.dataChannel.close();
    }
    if (remoteConnection.pc.connectionState !== "closed") {
      remoteConnection.pc.close();
    }
  }, { once: true });
}

async function testSign() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign", "verify"],
  );
  const data = "Hello world.";
  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-384" },
    },
    keyPair.privateKey,
    new TextEncoder().encode(data),
  );
  console.log(signature);
}

function testWebSocket(wsUrl: string, logger: Logger) {
  const ws = new WebSocket(wsUrl);

  // keep-alive
  ws.on("open", () => {
    let pingTimeout = setTimeout(() => {
      ws.terminate();
    }, 30_000 + 1_000);

    ws.on("ping", () => {
      clearTimeout(pingTimeout);
      ws.pong();

      pingTimeout = setTimeout(() => {
        ws.terminate();
      }, 30_000 + 1_000);
    });
    ws.on("close", () => {
      clearTimeout(pingTimeout);
    });
  });

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
      targetId: z.number(),
      payload: z.string(),
    }),
    z.object({
      type: z.literal("candidate"),
      targetId: z.number(),
      payload: z.string(),
    }),
  ]);

  ws.on("open", () => {
    let id: number|undefined = undefined;
    ws.on("message", (data, isBinary) => {
      try {
        const message = schema.parse(JSON.parse(data.toString()) as unknown);
        switch (message.type) {
          case "initial": {
            if (message.payload.id) {
              id = message.payload.id;
            }
            break;
          }
          case "offer":
          case "answer":
          case "candidate":
            break;
        }
      } catch (err) {
        logger.error("failed to parse", err);
      }
    });
  })
}

window.addEventListener("load", async () => {

}, { once: true });
