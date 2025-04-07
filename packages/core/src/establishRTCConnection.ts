import type {
  Logger,
  RTCPeerConnectionFactory,
  SignalingChannel,
} from '@tsuredure-sns/types';

/**
 * Establishing a connection: The WebRTC perfect negotiation pattern
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
 * @param factory - RTCPeerConnectionFactory
 * @param configuration - RTC configuration
 * @param logger - Logger
 * @param polite - Polite mode which uses ICE rollback to prevent collisions with incoming offers. A polite peer, essentially, is one which may send out offers, but then responds if an offer arrives from the other peer with "Okay, never mind, drop my offer and I'll consider yours instead."
 * @param signaler - Signaling handler
 * @returns Promise<RTCPeerConnection>
 */
export async function establishRTCConnection(
  factory: RTCPeerConnectionFactory,
  configuration: RTCConfiguration,
  logger: Logger,
  polite: boolean,
  signaler: SignalingChannel,
): Promise<RTCPeerConnection> {
  return new Promise<RTCPeerConnection>((resolve, reject) => {
    const pc = factory.create(configuration);
    let makingOffer = false;
    let ignoreOffer = false;

    pc.addEventListener('iceconnectionstatechange', () => {
      logger.debug('ICE connection state changed', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        logger.debug('restart ice');
        pc.restartIce();
      }
    });
    pc.addEventListener('icecandidateerror', (event) => {
      logger.error(
        'ICE candidate error',
        event.errorCode,
        event.url,
        event.errorText,
      );
    });
    pc.addEventListener('connectionstatechange', () => {
      logger.debug('Connection state changed', pc.connectionState);
    });
    pc.addEventListener('signalingstatechange', () => {
      logger.debug('Signaling state changed', pc.signalingState);
      if (pc.signalingState === 'stable') {
        resolve(pc);
      }
    });
    pc.addEventListener('icegatheringstatechange', () => {
      logger.debug('ICE gathering state changed', pc.iceGatheringState);
    });
    pc.addEventListener('icecandidate', async ({ candidate }) => {
      if (candidate === null) {
        return;
      }
      logger.debug('Got ice candidate');
      signaler.sendCandidate(candidate);
    });
    pc.addEventListener('negotiationneeded', async () => {
      logger.debug('Negotiation needed');
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        logger.debug('Offer was created');
        if (!pc.localDescription) {
          throw new Error('No local description');
        }
        signaler.sendDescription(pc.localDescription);
      } catch (err) {
        logger.error('Failed to create offer', err);
        reject(err);
      } finally {
        makingOffer = false;
      }
    });
    signaler.addEventListener('description', async ({ description }) => {
      try {
        logger.debug('Got description', description.type);
        const isOffer = description.type === 'offer';
        const offerCollision =
          isOffer && (makingOffer || pc.signalingState !== 'stable');
        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) {
          logger.debug('Ignoring offer');
          return;
        }
        logger.debug('Set remote description');
        await pc.setRemoteDescription(description);
        if (isOffer) {
          await pc.setLocalDescription();
          if (!pc.localDescription) {
            throw new Error('No local description');
          }
          logger.debug('Answer was created');
          signaler.sendDescription(pc.localDescription);
        }
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
    signaler.addEventListener('candidate', async ({ candidate }) => {
      try {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) {
            throw err;
          }
        }
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  });
}
