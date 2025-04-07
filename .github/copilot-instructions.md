# Tsuredure(徒然) Decentralized-SNS

This project uses English to comment.

All of projects is written by TypeScript.

Formatter/Linter is biome(uses `pnpm run format`).

Project is architected with monorepo using turborepo.

Main contributor is Japanese person, so some instructions will be performed using Japanese.

## Concepts

- Main connection is WebRTC(Peer to peer)
- Initial connection is using proxy WebSocket server(node.js/Cloudflare Workers etc...)
- Protocol is JSON-RPC 2.0-based bidirectional
