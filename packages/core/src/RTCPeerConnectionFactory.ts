import type { RTCPeerConnectionFactory } from '@tsuredure-sns/types';

export class RTCPeerConnectionFactoryImpl implements RTCPeerConnectionFactory {
  public create(configuration: RTCConfiguration): RTCPeerConnection {
    return new RTCPeerConnection(configuration);
  }
}
