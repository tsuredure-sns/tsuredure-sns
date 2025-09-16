
# Signaling Server

The signaling server is responsible for exchanging the information needed for peers to establish direct connections. Specifically, it mediates WebRTC connection details (SDP and ICE candidates).

STUN servers assist NAT traversal used by WebRTC and exist separately from the signaling server. You can use public STUN servers such as Google's, or run your own if necessary.

TURN servers act as relays when NAT traversal is difficult. TURN servers must be configured separately from the signaling server.

Because STUN/TURN infrastructure is somewhat complex and operationally costly, you can register existing solutions such as `coturn` with a signaling server.

## Roles of the signaling server

- Relay peer connection information (SDP, ICE candidates)
- Peer discovery and management
- Optional short-term TTL storage for posts (when needed)
