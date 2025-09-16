import type { RTCPeerConnectionFactory } from './types.js';

export class RTCPeerConnectionFactoryImpl implements RTCPeerConnectionFactory {
  public create(configuration: RTCConfiguration): RTCPeerConnection {
    return new RTCPeerConnection(configuration);
  }
}
