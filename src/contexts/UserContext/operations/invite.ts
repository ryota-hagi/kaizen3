// ダミーの招待関連関数
import { UserInfo } from '@/utils/api';
import { Dispatch, SetStateAction } from 'react';

// ダミーの招待関数
export const inviteUser = async (
  inviteData: any,
  currentUser: UserInfo | null,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>
) => {
  console.log('招待機能は無効化されています');
  return { success: false, message: '招待機能は無効化されています' };
};

// ダミーの招待トークン検証関数
export const verifyInviteToken = async (
  token: string,
  users: UserInfo[],
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) => {
  console.log('招待機能は無効化されています');
  return { valid: false, error: '招待機能は無効化されています' };
};

// ダミーの招待完了関数
export const completeInvitation = async (
  token: string,
  userData: any,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>
) => {
  console.log('招待機能は無効化されています');
  return false;
};
