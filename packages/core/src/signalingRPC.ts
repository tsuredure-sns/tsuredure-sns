import {
  JSONRPCClient,
  JSONRPCServer,
  JSONRPCServerAndClient,
  type TypedJSONRPCClient,
  type TypedJSONRPCServer,
  type TypedJSONRPCServerAndClient,
} from 'json-rpc-2.0';

export type TemporaryIdentifier = string;

/**
 * An interface representing a signaling RPC service.
 */
export interface SignalingRPCClient {
  onReceive(data: string): void;

  /**
   * Returns a recommended RTCConfiguration for establishing a WebRTC connection.
   */
  getRecommendedRPCConfiguration(): PromiseLike<RTCConfiguration>;

  /**
   * Sends a description event containing the RTC session description and temporary identifier.
   * @param args - The description event containing the RTC session description and temporary identifier.
   * @returns A promise that resolves to an array of description events about active peers.
   */
  broadcastOffer(args: BroadcastOfferArgs): PromiseLike<BroadcastOfferResult[]>;

  /**
   * Sends a candidate event containing the ICE candidate and temporary identifier.
   * @param args - The candidate event containing the ICE candidate and temporary identifier.
   */
  sendCandidateTo(args: SendCandidateToArgs): PromiseLike<void>;

  terminate(): void;
}

export type SignalingRPCClientToServer = {
  getRecommendedRPCConfiguration(): RTCConfiguration;
  broadcastOffer(args: BroadcastOfferArgs): BroadcastOfferResult[];
  sendCandidateTo(args: SendCandidateToArgs): void;
};

export interface BroadcastOfferArgs {
  description: RTCSessionDescriptionInit;
}

export interface BroadcastOfferResult {
  description: RTCSessionDescriptionInit;
  fromId: TemporaryIdentifier;
}

export interface BroadcastOfferResult {
  description: RTCSessionDescriptionInit;
  fromId: TemporaryIdentifier;
}

export interface SendCandidateToArgs {
  candidate: RTCIceCandidateInit;
  toId: TemporaryIdentifier;
}

export interface SignalingRPCServer {
  onReceive(data: string): void;

  /**
   * Sends a description event containing the RTC session description and temporary identifier.
   * @param args - The description event containing the RTC session description and temporary identifier.
   * @returns A promise that resolves to the peer's description event.
   */
  sendOffer(args: SendOfferArgs): PromiseLike<SendOfferResult>;

  /**
   * Sends a candidate event containing the ICE candidate and temporary identifier.
   * @param args - The candidate event containing the ICE candidate and temporary identifier.
   * @returns A promise that resolves to the peer's candidate event.
   */
  sendCandidateTo(args: SendCandidateToArgs): void;

  terminate(): void;
}

export interface SendOfferArgs {
  description: RTCSessionDescriptionInit;
  fromId: TemporaryIdentifier;
}

export interface SendOfferResult {
  description: RTCSessionDescriptionInit;
  toId: TemporaryIdentifier;
}

export type SignalingRPCServerToClient = {
  sendOffer(args: SendOfferArgs): SendOfferResult;
  sendCandidate(args: SendCandidateToArgs): void;
};

export class SignalingRPCClientImpl implements SignalingRPCClient {
  private readonly rpc: TypedJSONRPCServerAndClient<
    SignalingRPCServerToClient,
    SignalingRPCClientToServer
  >;

  public constructor(sender: (jsonRPCRequest: unknown) => void) {
    const server: TypedJSONRPCServer<SignalingRPCServerToClient> =
      new JSONRPCServer({});
    const client: TypedJSONRPCClient<SignalingRPCClientToServer> =
      new JSONRPCClient(sender);
    this.rpc = new JSONRPCServerAndClient(server, client);
  }

  public onReceive(data: string): void {
    this.rpc.receiveAndSend(JSON.parse(data));
  }

  getRecommendedRPCConfiguration(): PromiseLike<RTCConfiguration> {
    return this.rpc.request('getRecommendedRPCConfiguration');
  }

  broadcastOffer(
    args: BroadcastOfferArgs,
  ): PromiseLike<BroadcastOfferResult[]> {
    return this.rpc.request('broadcastOffer', args);
  }

  sendCandidateTo(args: SendCandidateToArgs): PromiseLike<void> {
    return this.rpc.request('sendCandidateTo', args);
  }

  public terminate(): void {
    this.rpc.rejectAllPendingRequests('terminated');
  }
}

export class SignalingRPCServerImpl implements SignalingRPCServer {
  private readonly rpc: TypedJSONRPCServerAndClient<
    SignalingRPCClientToServer,
    SignalingRPCServerToClient
  >;

  public constructor(
    addMethods: (
      server: TypedJSONRPCServer<SignalingRPCClientToServer>,
    ) => void,
    sender: (jsonRPCResponse: unknown) => void,
  ) {
    const server: TypedJSONRPCServer<SignalingRPCClientToServer> =
      new JSONRPCServer();
    addMethods(server);
    const client: TypedJSONRPCClient<SignalingRPCServerToClient> =
      new JSONRPCClient(sender);
    this.rpc = new JSONRPCServerAndClient(server, client);
  }

  public onReceive(data: string): void {
    this.rpc.receiveAndSend(JSON.parse(data));
  }

  public sendOffer(args: SendOfferArgs): PromiseLike<SendOfferResult> {
    return this.rpc.request('sendOffer', args);
  }

  public sendCandidateTo(args: SendCandidateToArgs): void {
    this.rpc.notify('sendCandidate', args);
  }

  public terminate(): void {
    this.rpc.rejectAllPendingRequests('terminated');
  }
}
