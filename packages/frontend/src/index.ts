import { registerSW } from "virtual:pwa-register";

registerSW();

interface SignalingHandlerInterface extends EventTarget {
  sendDescription(description: RTCSessionDescription): Promise<void>;
  sendCandidate(candidate: RTCIceCandidate): Promise<void>;
}

class DescriptionEvent extends Event {
  constructor(public readonly description: RTCSessionDescription) {
    super("description");
  }
}

class CandidateEvent extends Event {
  constructor(public readonly candidate: RTCIceCandidate) {
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
        this.target?.dispatchEvent(new DescriptionEvent(description));
        resolve();
      }, 10);
    });
  }
  public async sendCandidate(candidate: RTCIceCandidate): Promise<void> {
    // Simulate network delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.target?.dispatchEvent(new CandidateEvent(candidate));
        resolve();
      }, 50);
    });
  }
}

class Logger {
  constructor(private readonly id: string) {}
  public log(...args: any[]) {
    console.log(`[${this.id}]`, ...args);
  }
  public error(...args: any[]) {
    console.error(`[${this.id}]`, ...args);
  }
}

function establishRTCConnection(logger: Logger, polite: boolean, signal: SignalingHandlerInterface) {
  const pc = new RTCPeerConnection({
    iceServers: [
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
    ],
  });
  let makingOffer = false;
  let ignoreOffer = false;

  const dataChannel = pc.createDataChannel("dataChannel");
  dataChannel.addEventListener("open", () => {
    logger.log("Data channel opened!!!");
    dataChannel.send("Hello world");
  });
  pc.addEventListener("datachannel", (event) => {
    event.channel.addEventListener("message", (message) => {
      logger.log("Received message", message.data);
    });
    event.channel.addEventListener("error", (err) => {
      logger.error("Data channel error", err);
    });
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    logger.log("ICE connection state changed", pc.iceConnectionState);
    if (pc.iceConnectionState === "failed") {
      logger.log("restart ice");
      pc.restartIce();
    }
  });
  pc.addEventListener("icecandidateerror", (event) => {
    logger.error("ICE candidate error", event.errorCode, event.url, event.errorText);
  });
  pc.addEventListener("connectionstatechange", () => {
    logger.log("Connection state changed", pc.connectionState);
  });
  pc.addEventListener("signalingstatechange", () => {
    logger.log("Signaling state changed", pc.signalingState);
  });
  pc.addEventListener("icegatheringstatechange", () => {
    logger.log("ICE gathering state changed", pc.iceGatheringState);
  });
  pc.addEventListener("icecandidate", async ({ candidate }) => {
    logger.log("Got ice candidate");
    await signal.sendCandidate(candidate);
  });
  pc.addEventListener("negotiationneeded", async () => {
    logger.log("Negotiation needed");
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
      logger.log("Got description", description);
      const isOffer = description.type === "offer";
      const offerCollision = isOffer && (makingOffer || pc.signalingState !== "stable");
      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) {
        logger.log("Ignoring offer");
        return;
      }
      logger.log("Set remote description");
      await pc.setRemoteDescription(description);
      if (isOffer) {
        await pc.setLocalDescription();
        if (!pc.localDescription) {
          throw new Error("No local description");
        }
        logger.log("Created answer", pc.localDescription);
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

window.addEventListener("load", async () => {
  const localLogger = new Logger("local");
  const remoteLogger = new Logger("remote");
  const localIsPolite = true;
  const remoteIsPolite = false;
  const localSignal = new LocalSinalHandler();
  const remoteSignal = new LocalSinalHandler();
  localSignal.setTarget(remoteSignal);
  remoteSignal.setTarget(localSignal);

  const localConnection = establishRTCConnection(localLogger, localIsPolite, remoteSignal);
  const remoteConnection = establishRTCConnection(remoteLogger, remoteIsPolite, localSignal);

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
}, { once: true });
