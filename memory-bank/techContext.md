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
- **UI/UXライブラリ**: 必要に応じて検討

### バックエンド
- **サーバー**: Next.js API Routes
- **データベース**: 現在はローカルストレージ、将来的にはサーバーサイドストレージを検討
- **認証**: 未実装（将来的にはNext Auth検討）
- **API設計**: RESTful原則に基づく設計

### AI統合
- **AI API**: Claude API（Anthropic）
- **プロンプトエンジニアリング**: コンテキスト認識型プロンプト
- **コンテキスト管理**: メモリーバンクとの連携
- **応答生成**: 構造化された応答フォーマット

### デプロイ
- **ホスティング**: 未定（Vercel推奨）
- **CI/CD**: 未実装
- **環境分離**: 開発/ステージング/本番環境の計画

## 開発環境

### 必要条件
- Node.js 18.x以上
- npm 9.x以上またはYarn
- Git
- エディタ: VSCode推奨（拡張機能: ESLint, Prettier, Tailwind CSS IntelliSense）

### セットアップ手順
1. リポジトリのクローン
2. 依存関係のインストール（`npm install`）
3. 環境変数の設定（`.env.local`）
4. 開発サーバーの起動（`npm run dev`）
5. ブラウザで http://localhost:3000 にアクセス

### 環境変数
- `CLAUDE_API_KEY`: Claude APIのアクセスキー
- `NEXT_PUBLIC_API_BASE_URL`: API基本URL（開発環境では通常 http://localhost:3000/api）
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
│   │   ├── memory/    # メモリー関連コンポーネント（計画中）
│   │   └── workflow/  # ワークフロー関連コンポーネント
│   ├── contexts/      # Reactコンテキスト
│   ├── hooks/         # カスタムフック
│   ├── styles/        # グローバルスタイル
│   ├── types/         # TypeScript型定義
│   └── utils/         # ユーティリティ関数
├── memory-bank/       # メモリーバンク（ドキュメント）
│   ├── projectbrief.md       # プロジェクト概要
│   ├── productContext.md     # プロダクトコンテキスト
│   ├── systemPatterns.md     # システムパターン
│   ├── techContext.md        # テクニカルコンテキスト
│   ├── activeContext.md      # アクティブコンテキスト
│   └── progress.md           # 進捗状況
├── .env.local         # 環境変数
├── next.config.js     # Next.js設定
├── package.json       # 依存関係
├── tailwind.config.js # Tailwind CSS設定
└── tsconfig.json      # TypeScript設定
```

### 主要ファイル
- `src/app/layout.tsx`: アプリケーションのルートレイアウト
- `src/app/page.tsx`: ホームページ
- `src/app/workflows/page.tsx`: ワークフローリストページ
- `src/app/workflows/[id]/page.tsx`: ワークフロー詳細ページ
- `src/contexts/WorkflowContext.tsx`: ワークフロー状態管理
- `src/components/workflow/WorkflowEditor.tsx`: ワークフローエディタ
- `src/components/workflow/WorkflowBlock.tsx`: ワークフローブロック
- `src/components/chat/ChatInterface.tsx`: チャットインターフェース
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
  tags?: string[];
  status?: 'draft' | 'active' | 'archived';
}

interface WorkflowBlock {
  id: string;
  type: string;
  content: string;
  position: { x: number; y: number };
  connections: string[]; // 接続先ブロックのID
  config: Record<string, any>; // ブロック固有の設定
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
  };
}
```

### メモリーバンク（計画中）
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
  metadata?: {
    source?: string;
    importance?: number;
    lastAccessed?: string;
  };
}

interface MemoryCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // 階層構造のための親カテゴリID
}
```

### チャット
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextInfo?: {
    workflowId?: string;
    memoryIds?: string[];
    blockIds?: string[];
  };
  metadata?: {
    tokens?: number;
    processingTime?: number;
    model?: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  summary?: string;
  tags?: string[];
}
```

## 外部依存関係

### NPMパッケージ
- `next`: Webアプリケーションフレームワーク
- `react`, `react-dom`: UIライブラリ
- `typescript`: 型安全な開発
- `tailwindcss`: ユーティリティファーストCSSフレームワーク
- `postcss`, `autoprefixer`: CSSプロセッシング
- その他必要に応じて追加予定:
  - `react-hook-form`: フォーム管理
  - `zod`: スキーマ検証
  - `swr` または `react-query`: データフェッチング
  - `marked` または `react-markdown`: マークダウンレンダリング

### 外部API
- **Claude API**: AIアシスタント機能
  - エンドポイント: `https://api.anthropic.com/v1/messages`
  - 認証: API Key
  - 使用方法: `src/app/api/claude/route.ts`で実装
  - モデル: claude-3-opus-20240229

## 技術的制約

### パフォーマンス
- クライアントサイドのレンダリングパフォーマンス最適化
- API呼び出しの効率化（キャッシュ、バッチ処理）
- 大規模データセットの効率的な処理
- ワークフローエディタの描画パフォーマンス

### セキュリティ
- API Keyの安全な管理
- ユーザーデータの保護（将来的に実装）
- 入力検証とサニタイズ
- CORS設定の適切な管理

### アクセシビリティ
- WAI-ARIA準拠のUI
- キーボードナビゲーション
- スクリーンリーダー対応
- 色のコントラスト比の確保

### ブラウザ互換性
- モダンブラウザ（Chrome, Firefox, Safari, Edge）
- モバイルレスポンシブデザイン
- タッチデバイス対応

## 開発プラクティス

### コーディング規約
- ESLintとPrettierによるコード整形
- TypeScriptの厳格モード
- コンポーネント命名規則: PascalCase
- ファイル命名規則: 機能に基づく命名
- コメント規約: JSDoc形式の関数コメント

### バージョン管理
- Git
- 機能ブランチワークフロー
- コミットメッセージ規約: 明確な変更内容の記述
- プルリクエストとコードレビュー（将来的に）

### テスト戦略
- Jest: ユニットテスト
- React Testing Library: コンポーネントテスト
- Cypress: E2Eテスト（将来的に実装）
- スナップショットテスト: UIコンポーネント

### デプロイフロー
- 開発環境: ローカル開発サーバー
- ステージング: 未定（Vercel Previewを検討）
- 本番: 未定（Vercelを検討）
- 継続的デプロイ: GitHub連携（将来的に）

## 将来の技術的検討事項

### スケーラビリティ
- サーバーサイドデータベースへの移行
- マイクロサービスアーキテクチャの検討
- キャッシュ戦略の実装
- 水平スケーリングの対応

### 機能拡張
- リアルタイム協力機能
- プラグインシステム
- 高度な分析と可視化
- AIによる自動最適化提案

### インテグレーション
- 外部ツールとの連携（Slack, GitHub, Trelloなど）
- APIエコシステムの構築
- データインポート/エクスポート機能
- Webhookによるイベント通知

### パフォーマンス最適化
- コード分割とレイジーローディング
- サーバーサイドレンダリングの最適化
- 画像と静的アセットの最適化
- 仮想化リストとウィンドウイング技術

### 開発効率化
- コンポーネントライブラリの整備
- ストーリーブックによるUI開発
- 自動テスト環境の構築
- CI/CDパイプラインの整備
