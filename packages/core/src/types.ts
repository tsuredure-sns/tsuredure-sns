export interface IdentityGenerator {
  generate(): Promise<Identifier>;
}

/**
 * A unique identifier for an object
 */
export type Identifier = string;

/**
 * An object that has an identifier
 */
export interface HasIdentity {
  getIdentifier(): Identifier;
}

export interface DID extends HasIdentity {}

export interface Logger {
  info(...args: unknown[]): void;
  warning(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

export interface SignalingChannel {
  sendDescription(description: RTCSessionDescription): void;
  sendCandidate(candidate: RTCIceCandidate): void;
  addEventListener(
    type: 'description',
    listener: (event: DescriptionEvent) => Promise<void>,
  ): void;
  addEventListener(
    type: 'candidate',
    listener: (event: CandidateEvent) => Promise<void>,
  ): void;
}

export interface DescriptionEvent {
  description: RTCSessionDescription;
}

export interface CandidateEvent {
  candidate: RTCIceCandidate;
}

export type ProxyClientToServerMethods = {
  getRecommendedRPCConfiguration(): Promise<RTCConfiguration>;
  listActivePeers(): Promise<DID[]>;
  /**
   * Send a description to the server
   * @param description
   */
  sendDescription(args: DescriptionEvent): void;
  /**
   * Send a ICE candidate to the server
   * @param candidate
   */
  sendCandidate(args: CandidateEvent): void;
};

export type ProxyServerToClientMethods = {
  /**
   * Receive a description from the server
   * @param description
   * @param user
   */
  onDescription(args: { description: RTCSessionDescription; user: DID }): void;
  /**
   * Receive a ICE candidate from the server
   * @param candidate
   * @param user
   */
  onCandidate(args: { candidate: RTCIceCandidate; user: DID }): void;
};

export interface RTCPeerConnectionFactory {
  create(configuration: RTCConfiguration): RTCPeerConnection;
}
