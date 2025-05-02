/**
 * 招待関連の定数
 */

// テーブル名とビュー名
export const INVITATIONS_TABLE = 'user_invitations';
export const INVITATIONS_VIEW = 'user_invitations_view';

// ステータス
export const INVITE_STATUS_PENDING = 'pending';  // Supabase側のステータス
export const INVITE_STATUS_ACCEPTED = 'completed';
export const INVITE_STATUS_EXPIRED = 'expired';

// ローカルストレージ側のステータス
export const LOCAL_STATUS_INVITED = '招待中';
export const LOCAL_STATUS_ACTIVE = 'アクティブ';
