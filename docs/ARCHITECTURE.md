# ARCHITECTURE

このドキュメントは Tsuredure(徒然) 分散 SNS のアーキテクチャ設計をまとめる。主に TypeScript 実装を前提としつつ、Cloudflare Workers を推奨するシグナリングやブラウザの OPFS を用いた永続化など、実装指針を示す。

目的と要件

- ブラウザ単体での投稿・受信（ピア間は WebRTC）
- ブラウザ内 OPFS を用いたローカル永続化（投稿・メタ・埋め込みを保持）
- シグナリングは軽量な仲介サーバを用い、必要に応じて短期 TTL の一時保存を許容
- 投稿は Ed25519 で署名し、受信側は署名検証で真正性を確認（`Web Crypto API` を第一選択）
- タイムラインは時系列と類似度に基づいて表示

主要コンポーネント

- ブラウザクライアント（TypeScript）
  - UI（投稿、タイムライン、プロフィール、接続管理）
  - P2P（WebRTC、DataChannel、必要に応じて SFU）
  - 永続化（OPFS 上の SQLite via `pglite`）
  - 署名/検証（Ed25519 via `Web Crypto API`、未対応時は `tweetnacl-js`）

- シグナリングサーバ（推奨: Cloudflare Workers、OSS）
  - 役割: SDP/ICE 中継、ピア発見、短期 TTL の投稿一時保存
  - 公開ポリシー: OSS テンプレートを提供し誰でもデプロイ可能にする
  - 実装候補: Cloudflare Workers（Durable Objects を必要に応じて利用）、自己ホスト用に node/deno/bun テンプレートを同梱

データモデル（ローカル）

- Post (immutable)
  - id: string (base64url 化された SHA-256 ハッシュ推奨)
  - author: publicKey (Ed25519, base64)
  - timestamp: number (Unix ms)
  - content: string
  - signature: string (Ed25519 over canonicalized JSON)
  - metadata: { tags?: string[], replyTo?: postId }
  - embedding?: number[]

- Indexes: `timelineIndex`, `similarityIndex`, `peerList`

OPFS 永続化戦略（pglite + Prisma）

- 技術選定
  - ブラウザ内 DB: `pglite`（SQLite 実装）を OPFS に配置
  - ORM: `Prisma` を用い型安全にスキーマ管理・クエリを行う（ブラウザ向けクライアントの軽量化を検討）

- DB レイアウト
  - ファイル: `/databases/tsuredure.db`（SQLite）
  - テーブル例: `posts`, `profiles`, `timeline_index`, `embeddings`, `peers`, `meta`

- 書き込み / 同期
  - pglite の WAL 等で原子的トランザクションを実現
  - 起動時に Prisma 経由でインデックスをロードし、OPFS の変更を監視して UI を更新
  - 受信投稿はトランザクション内で挿入、タイムスタンプと投稿 ID（ハッシュ）でコンフリクト解決

- 容量管理 / GC
  - 最大件数 / バイト数で保存ポリシーを決め、古い投稿は段階的に削除
  - GC はバックグラウンド実行、ピン留めは除外

- 冗長化
  - シグナリングの永続化は短期 TTL を必須化。クライアントは複数シグナリングに通知して冗長化可能

シグナリングサーバ設計（Cloudflare Workers, OSS）

- 機能: ピア登録/発見、offer/answer/ice 中継、短期 TTL 保存（任意）、ログ/メトリクス
- データ保持: デフォルト TTL（例: 24h）、運用者がポリシー変更可能
- プロトコル: JSON-RPC 2.0 over WebSocket を推奨（メソッド: `register`, `discover`, `offer`, `answer`, `ice`, `storeTempPost`）
- デプロイ: Workers テンプレート + Wrangler/GitHub Actions の手順を提供

WebRTC と DataChannel

- ピア接続フロー: 発見 → offer (A->B) → answer (B->A) → ICE 交換 → DataChannel open → 投稿送信
- DataChannel の使い分け: reliable ordered（重要投稿）、unreliable unordered（プレゼンス等）
- グループ配信: 少人数はメッシュ、多人数は SFU を検討

署名と検証（Ed25519 via Web Crypto API）

- 方針: `Web Crypto API`（SubtleCrypto）を第一選択。未対応環境は `tweetnacl-js` をフォールバック
- 鍵管理: クライアントで鍵生成、秘密鍵は OPFS に暗号化して保存（ユーザーパスフレーズ or プラットフォーム KeyStore）
- 署名手順: canonicalized JSON を生成 → `SubtleCrypto.sign` → base64url 保存。検証は `SubtleCrypto.verify`。

タイムラインと類似度

- 基本: 時系列降順で表示
- 類似度: クライアントで軽量埋め込みを生成しコサイン類似度で関連投稿をグループ化。スケール時は HNSW 等を検討

セキュリティ

- 通信は TLS（WSS）必須
- 秘密鍵は最小権限で保管、可能なら WebAuthn を利用
- シグナリングはレート制御・認証（トークン）を実装

デプロイ & 運用

- 本番推奨: Cloudflare Workers
- 自己ホスト: node/deno/bun テンプレートを提供
- モニタリング: 接続数、失敗率、シグナリングイベント数を監視

実装ノート / 候補ライブラリ

- WebRTC: ブラウザ標準 API
- Ed25519: `Web Crypto API`（SubtleCrypto）→ フォールバック `tweetnacl-js`
- OPFS / DB: `pglite` + `Prisma`
- シグナリング: Cloudflare Workers + Durable Objects（必要時）

将来の拡張案

- 分散公開鍵ディレクトリ（DHT）
- コンテンツ分類/フィルタリングのオプション化
- モバイル向けストレージ対応（React Native / Capacitor）
