# ARCHITECTURE

This document summarizes the architecture design for Tsuredure (Tsuredure) decentralized SNS. It assumes a TypeScript implementation and provides implementation guidance such as recommending Cloudflare Workers for signaling and using the browser's OPFS for persistence.

## Purpose and Requirements

- P2P SNS without a centralized server
- Runs in the browser alone (no installation required)
- Post persistence and signature verification
- Simple and extensible data model
- Prioritize security and privacy
- Web 3.0–like concept but different in key ways

### Technical Requirements

- TypeScript + React + Vite + Tailwind CSS
- Browser-side persistence using `pglite` + OPFS (Origin Private File System)
- P2P post distribution via WebRTC + DataChannel
- Ed25519 signing/verification via the Web Crypto API

#### Node Server

- Lightweight TypeScript-based signaling server
- Easily and cheaply hostable on Cloudflare Workers, Deno Deploy, node.js, Bun, Vercel, Netlify, Render, etc.
- The signaling server's primary role is to mediate connections; it should avoid persisting posts whenever possible

## Main Components

### Browser Client (TypeScript)

- UI (posting, timeline, profile, connection management)
- P2P (WebRTC, DataChannel, optionally SFU when needed)
- Persistence (Postgres on OPFS via `pglite`)
- Signing/verification (Ed25519 via `Web Crypto API`, fallback to `tweetnacl-js`)

### Signaling Server (recommended: Cloudflare Workers, OSS)

- Role: relay SDP/ICE, peer discovery, optional short-term TTL storage for posts
- Public policy: provide an OSS template so anyone can deploy their own
- Serverless deployment on Cloudflare Workers is recommended but users may choose other hosts

## Data Model (local)

### Post

```json
{
  "id": "string",
  "author": "string",
  "timestamp": 1234567890,
  "content": "string",
  "signature": "string",
  "metadata": {
    "tags": ["tag1", "tag2"],
    "replyTo": "postId"
  }
}
```

### OPFS Persistence Strategy (`pglite` + Prisma)

- Technology choices
  - In-browser DB: `pglite` (SQLite implementation) stored on OPFS
  - ORM: `Prisma` for type-safe schema management and queries (consider client-side lightweight options)
- DB layout
  - File: `/databases/tsuredure.db`
  - Example tables: `posts`, `profiles`, `timeline_index`, `embeddings`, `peers`, `meta`
- Writes / Sync
  - Use pglite's WAL to achieve atomic transactions
  - On startup, load indexes via Prisma and watch OPFS changes to update the UI
  - Insert received posts inside transactions and resolve conflicts using timestamps and post IDs (hashes)
- Capacity management / GC
  - Decide retention policies by maximum count or bytes and progressively delete older posts
  - Run GC in the background and exclude pinned items
- Redundancy
  - Signaling persistence should require short TTL; clients can notify multiple signaling servers for redundancy

### Signaling Server Design (Cloudflare Workers, OSS)

- Functions: peer registration/discovery, offer/answer/ice relay, optional short-term TTL storage, logs/metrics
- Data retention: default TTL (e.g., 24h), operator-configurable policies
- Protocol: recommend JSON-RPC 2.0 over WebSocket (methods: `register`, `discover`, `offer`, `answer`, `ice`, `storeTempPost`)
- Deployment: provide Workers template + Wrangler/GitHub Actions workflow

### WebRTC and DataChannel

- Peer connection flow: discovery → offer (A->B) → answer (B->A) → ICE exchange → DataChannel open → send posts
- DataChannel usage: reliable ordered for important posts, unreliable unordered for presence updates
- Group distribution: mesh for small groups, consider SFU for larger groups

### Signing and Verification (Ed25519 via Web Crypto API)

- Policy: prefer `Web Crypto API` (SubtleCrypto). Fallback to `tweetnacl-js` for unsupported environments
- Key management: generate keys on the client; encrypt and store private keys on OPFS (user passphrase or platform KeyStore)
- Signing procedure: generate canonicalized JSON → `SubtleCrypto.sign` → save as base64url. Verify with `SubtleCrypto.verify`.

### Timeline and Similarity

- Basic: display in descending chronological order
- Similarity: generate lightweight embeddings on the client and group related posts by cosine similarity. Consider HNSW for scale

### Security

- TLS (WSS) required for communication
- Store private keys with least privilege; use WebAuthn if available
- Implement rate limiting and authentication (tokens) in signaling

### Deployment & Operations

- Production recommendation: Cloudflare Workers
- Self-hosting: provide node/deno/bun templates
- Monitoring: track connection counts, failure rates, and signaling events

### Implementation Notes / Candidate Libraries

- WebRTC: browser standard APIs
- Ed25519: `Web Crypto API` (SubtleCrypto) → fallback `tweetnacl-js`
- OPFS / DB: `pglite` + `Prisma`
- Signaling: Cloudflare Workers + Durable Objects (if needed)

### Future Extensions

- Decentralized public key directory (DHT)
- Optional content categorization/filtering
- Mobile storage support (React Native / Capacitor)
