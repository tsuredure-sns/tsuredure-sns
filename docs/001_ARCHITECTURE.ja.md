# ARCHITECTURE

このドキュメントは Tsuredure(徒然) 分散 SNS のアーキテクチャ設計をまとめる。主に TypeScript 実装を前提としつつ、Cloudflare Workers を推奨するシグナリングやブラウザの OPFS を用いた永続化など、実装指針を示す。

## 目的と要件

- 中央集権サーバ不要の P2P SNS
- ブラウザ単体で動作（インストール不要）
- 投稿の永続化と署名検証
- シンプルで拡張可能なデータモデル
- セキュリティとプライバシーを最重要視
- Web3.0 っぽいけどちょっと違う

### 技術的要件

- TypeScript + React + Vite + Tailwindcss
- pglite + OPFS (Origin Private File System) を用いたブラウザ内永続化
- WebRTC + DataChannel による P2P 投稿配信
- Web Crypto API を用いた Ed25519 署名/検証

#### ノードサーバ

- 軽量な TypeScript ベースのシグナリングサーバ
- Cloudflare Workers, Deno deploy, node.js, Bun, Vercel, Netlify, Render などでシンプルに低コストでホスト可能
- シグナリングサーバはデータの仲介を主担当とし、投稿の永続化は出来るだけ行わない

## 主要コンポーネント

### ブラウザクライアント（TypeScript）

- UI（投稿、タイムライン、プロフィール、接続管理）
- P2P（WebRTC、DataChannel、必要に応じて SFU）
- 永続化（OPFS 上の PostgreSQL via `pglite`）
- 署名/検証（Ed25519 via `Web Crypto API`、未対応時は `tweetnacl-js`）

### シグナリングサーバ（推奨: Cloudflare Workers、OSS）

- 役割: SDP/ICE 中継、ピア発見、短期 TTL の投稿一時保存
- 公開ポリシー: OSS テンプレートを提供し誰でもデプロイ可能にする
- メインは Cloudflare workers によるサーバーレスを推奨するが、ユーザーが任意にデプロイ先を選択することが可能

## データモデル（ローカル）

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

### OPFS 永続化戦略（pglite + Prisma）

- 技術選定
  - ブラウザ内 DB: `pglite`（SQLite 実装）を OPFS に配置
  - ORM: `Prisma` を用い型安全にスキーマ管理・クエリを行う（ブラウザ向けクライアントの軽量化を検討）
- DB レイアウト
  - ファイル: `/databases/tsuredure.db`
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

### シグナリングサーバ設計（Cloudflare Workers, OSS）

- 機能: ピア登録/発見、offer/answer/ice 中継、短期 TTL 保存（任意）、ログ/メトリクス
- データ保持: デフォルト TTL（例: 24h）、運用者がポリシー変更可能
- プロトコル: JSON-RPC 2.0 over WebSocket を推奨（メソッド: `register`, `discover`, `offer`, `answer`, `ice`, `storeTempPost`）
- デプロイ: Workers テンプレート + Wrangler/GitHub Actions の手順を提供

### WebRTC と DataChannel

- ピア接続フロー: 発見 → offer (A->B) → answer (B->A) → ICE 交換 → DataChannel open → 投稿送信
- DataChannel の使い分け: reliable ordered（重要投稿）、unreliable unordered（プレゼンス等）
- グループ配信: 少人数はメッシュ、多人数は SFU を検討

### 署名と検証（Ed25519 via Web Crypto API）

- 方針: `Web Crypto API`（SubtleCrypto）を第一選択。未対応環境は `tweetnacl-js` をフォールバック
- 鍵管理: クライアントで鍵生成、秘密鍵は OPFS に暗号化して保存（ユーザーパスフレーズ or プラットフォーム KeyStore）
- 署名手順: canonicalized JSON を生成 → `SubtleCrypto.sign` → base64url 保存。検証は `SubtleCrypto.verify`。

### タイムラインと類似度

- 基本: 時系列降順で表示
- 類似度: クライアントで軽量埋め込みを生成しコサイン類似度で関連投稿をグループ化。スケール時は HNSW 等を検討

### セキュリティ

- 通信は TLS（WSS）必須
- 秘密鍵は最小権限で保管、可能なら WebAuthn を利用
- シグナリングはレート制御・認証（トークン）を実装

### デプロイ & 運用

- 本番推奨: Cloudflare Workers
- 自己ホスト: node/deno/bun テンプレートを提供
- モニタリング: 接続数、失敗率、シグナリングイベント数を監視

### 実装ノート / 候補ライブラリ

- WebRTC: ブラウザ標準 API
- Ed25519: `Web Crypto API`（SubtleCrypto）→ フォールバック `tweetnacl-js`
- OPFS / DB: `pglite` + `Prisma`
- シグナリング: Cloudflare Workers + Durable Objects（必要時）

### 将来の拡張案

- 分散公開鍵ディレクトリ（DHT）
- コンテンツ分類/フィルタリングのオプション化
- モバイル向けストレージ対応（React Native / Capacitor）
