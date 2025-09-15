# Tsuredure(徒然) Decentralized-SNS

This project uses English to comment.

All of projects is written by TypeScript.

Formatter/Linter is biome(uses `pnpm run lint`).

Project is architected with monorepo using pnpm.

Main contributor is Japanese person, so some instructions will be performed using Japanese.

## Concepts

- ARCHITECTURE is described in [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).
- Main connection is WebRTC(Peer to peer)
- Initial connection is using signaling server(node.js/Cloudflare Workers/deno deploy/Render/Vercel etc...)
- Protocol is JSON-RPC 2.0-based bidirectional, Streamable HTTP
