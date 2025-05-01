import { createContext, useContext } from 'react';
import { UserInfo, Employee } from '@/utils/api'; // パスを修正

// コンテキストの型定義
export interface UserContextType {
  currentUser: UserInfo | null;
  users: UserInfo[];
  isAuthenticated: boolean;
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>; // ユーザーリストを更新する関数を追加
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  updateUserAfterGoogleSignIn: (userData: Partial<UserInfo>) => Promise<boolean>;
  updateUserProfile: (userData: Partial<UserInfo>) => Promise<boolean>;
  updateUser: (userId: string, userData: Partial<UserInfo>) => Promise<boolean>; // 管理者用ユーザー編集関数
  getUserById: (id: string) => UserInfo | undefined;
  deleteUser: (userId: string) => Promise<{success: boolean, message?: string}>;
  deleteCompanyAccount: () => Promise<{success: boolean, message?: string}>; // 会社アカウント削除関数
  inviteUser: (inviteData: {email: string; role: string; companyId: string}) => Promise<{success: boolean, message?: string, inviteToken?: string}>; // ユーザー招待関数
  verifyInviteToken: (token: string) => Promise<{valid: boolean; user?: UserInfo}>; // 招待トークン検証関数（非同期に変更）
  completeInvitation: (token: string, userData: {fullName: string; companyId?: string}) => Promise<boolean>; // 招待完了関数
  getEmployees: () => Employee[]; // 従業員一覧を取得する関数
}

// パスワード情報を含むユーザーデータの型
export interface UserWithPassword {
  user: UserInfo;
  password: string;
}

// デフォルト値
export const defaultUserContext: UserContextType = {
  currentUser: null,
  users: [],
  isAuthenticated: false,
  setUsers: () => {}, // デフォルト値を追加
  loginWithGoogle: async () => false,
  logout: () => {},
  updateUserAfterGoogleSignIn: async () => false,
  updateUserProfile: async () => false,
  updateUser: async () => false,
  getUserById: () => undefined,
  deleteUser: async () => ({ success: false }),
  deleteCompanyAccount: async () => ({ success: false }),
  inviteUser: async () => ({ success: false }),
  verifyInviteToken: async () => ({ valid: false }), // 非同期関数に変更
  completeInvitation: async () => false,
  getEmployees: () => [],
};

// コンテキストの作成
export const UserContext = createContext<UserContextType>(defaultUserContext);

// コンテキストを使用するためのカスタムフック
export const useUser = () => useContext(UserContext);
