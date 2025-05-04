import { UserInfo } from '@/utils/api';

/**
 * ユーザーが招待中かどうかを判定するヘルパー関数
 * isInvited フラグではなく status フィールドを使用して判定
 * 
 * @param user ユーザー情報
 * @returns 招待中の場合は true、それ以外は false
 */
export const isUserInvited = (user?: UserInfo | null): boolean => {
  return user?.status === '招待中';
};

/**
 * ユーザーがアクティブかどうかを判定するヘルパー関数
 * 
 * @param user ユーザー情報
 * @returns アクティブな場合は true、それ以外は false
 */
export const isUserActive = (user?: UserInfo | null): boolean => {
  return user?.status === 'アクティブ';
};

/**
 * ユーザーが招待完了状態かどうかを判定するヘルパー関数
 * 
 * @param user ユーザー情報
 * @returns 招待完了状態の場合は true、それ以外は false
 */
export const isUserCompleted = (user?: UserInfo | null): boolean => {
  return user?.status === 'completed';
};

/**
 * ユーザーが招待フローを必要とするかどうかを判定するヘルパー関数
 * 
 * @param user ユーザー情報
 * @returns 招待フローが必要な場合は true、それ以外は false
 */
export const needsInviteFlow = (user?: UserInfo | null): boolean => {
  return user?.status === '招待中' || user?.status === 'verified';
};
