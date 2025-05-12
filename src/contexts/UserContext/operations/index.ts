// 認証関連の関数をエクスポート
// 最適化された認証関数のみをエクスポート
export * from './optimizedAuth';
// 注意: './auth'からのエクスポートは削除しました（競合を避けるため）
// ただし、updateUserAfterGoogleSignIn関数は必要なのでインポートして再エクスポート
import { updateUserInfo as updateUserAfterGoogleSignIn } from './optimizedAuth';
export { updateUserAfterGoogleSignIn };

// ユーザー管理関連の関数をエクスポート
export * from './user';

// 会社アカウント管理関連の関数をエクスポート
export * from './company';

// 招待関連の関数をエクスポート
export * from './invite';
