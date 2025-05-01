// UserContext.tsx - コンテキストのエクスポートファイル
// このファイルは、UserContextの実装をエクスポートするためのエントリーポイントです

'use client'

// context.tsとprovider.tsxからエクスポートを再エクスポート
export * from './UserContext/context'
export * from './UserContext/provider'

// デフォルトエクスポートとしてプロバイダーコンポーネントをエクスポート
import { UserContextProvider } from './UserContext/provider'
export default UserContextProvider
