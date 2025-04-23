# テクニカルコンテキスト

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14（App Router）
- **言語**: TypeScript
- **UIライブラリ**: React 18
- **スタイリング**: Tailwind CSS
- **状態管理**: React Context API
- **フォーム管理**: React Hook Form（予定）
- **データ取得**: SWR / React Query（予定）

### バックエンド
- **サーバー**: Next.js API Routes
- **データベース**: 現在はローカルストレージ、将来的にはサーバーサイドストレージを検討
- **認証**: 未実装（将来的にはNext Auth検討）

### AI統合
- **AI API**: Claude API（Anthropic）
- **プロンプトエンジニアリング**: コンテキスト認識型プロンプト

### デプロイ
- **ホスティング**: 未定（Vercel推奨）
- **CI/CD**: 未実装

## 開発環境

### 必要条件
- Node.js 18.x以上
- npm 9.x以上またはYarn
- Git

### セットアップ手順
1. リポジトリのクローン
2. 依存関係のインストール（`npm install`）
3. 環境変数の設定（`.env.local`）
4. 開発サーバーの起動（`npm run dev`）

### 環境変数
- `CLAUDE_API_KEY`: Claude APIのアクセスキー
- その他の設定変数（必要に応じて追加）

## プロジェクト構造

### ディレクトリ構成
```
/
├── public/            # 静的ファイル
│   └── images/        # 画像ファイル
├── src/               # ソースコード
│   ├── app/           # Next.js App Router
│   │   ├── api/       # API Routes
│   │   ├── mypage/    # マイページ
│   │   └── workflows/ # ワークフロー関連ページ
│   ├── components/    # Reactコンポーネント
│   │   ├── chat/      # チャット関連コンポーネント
│   │   ├── layouts/   # レイアウトコンポーネント
│   │   ├── memory/    # メモリー関連コンポーネント
│   │   └── workflow/  # ワークフロー関連コンポーネント
│   ├── contexts/      # Reactコンテキスト
│   ├── hooks/         # カスタムフック
│   ├── styles/        # グローバルスタイル
│   ├── types/         # TypeScript型定義
│   └── utils/         # ユーティリティ関数
├── memory-bank/       # メモリーバンク（ドキュメント）
├── .env.local         # 環境変数
├── next.config.js     # Next.js設定
├── package.json       # 依存関係
├── tailwind.config.js # Tailwind CSS設定
└── tsconfig.json      # TypeScript設定
```

### 主要ファイル
- `src/app/layout.tsx`: アプリケーションのルートレイアウト
- `src/contexts/WorkflowContext.tsx`: ワークフロー状態管理
- `src/contexts/MemoryContext.tsx`: メモリーバンク状態管理
- `src/components/workflow/WorkflowEditor.tsx`: ワークフローエディタ
- `src/components/chat/ChatInterface.tsx`: チャットインターフェース
- `src/components/memory/MemoryBank.tsx`: メモリーバンク表示
- `src/app/api/claude/route.ts`: Claude API統合

## データモデル

### ワークフロー
```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  blocks: WorkflowBlock[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowBlock {
  id: string;
  type: string;
  content: string;
  position: { x: number; y: number };
  connections: string[]; // 接続先ブロックのID
  config: Record<string, any>; // ブロック固有の設定
}
```

### メモリーバンク
```typescript
interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  relatedEntries?: string[]; // 関連エントリのID
}
```

### チャット
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  contextInfo?: {
    workflowId?: string;
    memoryIds?: string[];
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

## 外部依存関係

### NPMパッケージ
- `next`: Webアプリケーションフレームワーク
- `react`, `react-dom`: UIライブラリ
- `typescript`: 型安全な開発
- `tailwindcss`: ユーティリティファーストCSSフレームワーク
- `postcss`, `autoprefixer`: CSSプロセッシング
- その他必要に応じて追加

### 外部API
- **Claude API**: AIアシスタント機能
  - エンドポイント: `https://api.anthropic.com/v1/messages`
  - 認証: API Key
  - 使用方法: `src/app/api/claude/route.ts`で実装

## 技術的制約

### パフォーマンス
- クライアントサイドのレンダリングパフォーマンス最適化
- API呼び出しの効率化（キャッシュ、バッチ処理）
- 大規模データセットの効率的な処理

### セキュリティ
- API Keyの安全な管理
- ユーザーデータの保護（将来的に実装）
- 入力検証とサニタイズ

### アクセシビリティ
- WAI-ARIA準拠のUI
- キーボードナビゲーション
- スクリーンリーダー対応

### ブラウザ互換性
- モダンブラウザ（Chrome, Firefox, Safari, Edge）
- モバイルレスポンシブデザイン

## 開発プラクティス

### コーディング規約
- ESLintとPrettierによるコード整形
- TypeScriptの厳格モード
- コンポーネント命名規則: PascalCase
- ファイル命名規則: 機能に基づく命名

### バージョン管理
- Git
- 機能ブランチワークフロー
- コミットメッセージ規約: 明確な変更内容の記述

### テスト戦略
- Jest: ユニットテスト
- React Testing Library: コンポーネントテスト
- Cypress: E2Eテスト（将来的に実装）

### デプロイフロー
- 開発環境: ローカル開発サーバー
- ステージング: 未定
- 本番: 未定

## 将来の技術的検討事項

### スケーラビリティ
- サーバーサイドデータベースへの移行
- マイクロサービスアーキテクチャの検討
- キャッシュ戦略の実装

### 機能拡張
- リアルタイム協力機能
- プラグインシステム
- 高度な分析と可視化

### インテグレーション
- 外部ツールとの連携（Slack, GitHub, Trelloなど）
- APIエコシステムの構築
- データインポート/エクスポート機能

### パフォーマンス最適化
- コード分割とレイジーローディング
- サーバーサイドレンダリングの最適化
- 画像と静的アセットの最適化
