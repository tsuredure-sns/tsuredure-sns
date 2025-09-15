import type { RTCPeerConnectionFactory } from './types.ts';

export class RTCPeerConnectionFactoryImpl implements RTCPeerConnectionFactory {
  public create(configuration: RTCConfiguration): RTCPeerConnection {
    return new RTCPeerConnection(configuration);
  }
}
