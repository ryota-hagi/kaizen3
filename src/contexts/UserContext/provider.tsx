'use client'

/**
 * UserContextProvider - ユーザー認証と状態管理のためのコンテキストプロバイダー
 * 
 * このコンポーネントは以下の機能を提供します：
 * 1. ユーザー認証状態の管理
 * 2. ユーザー情報の管理
 * 3. 会社情報の管理
 * 4. 認証関連の操作（ログイン、ログアウト、ユーザー情報更新など）
 */

import React, { useState, useEffect, ReactNode, useRef, useCallback } from 'react'
import { UserInfo } from '@/utils/api';
import { UserContext, UserContextType } from './context';
import {
  updateUserProfile,
  getUserById,
  deleteUser,
  updateUser,
  getEmployees,
  deleteCompanyAccount,
  inviteUser,
  verifyInviteToken,
  completeInvitation
} from './operations/index';
import { 
  loginWithGoogle,
  logout,
  updateUserInfo
} from './operations/optimizedAuth';
import { 
  initializeProvider, 
  handleSessionExpired
} from './provider/initialization';
import {
  setupAuthStateChangeListener,
  setupSessionCheck
} from './provider/auth-listeners';

// デバッグモード（本番環境ではfalseに設定）
const DEBUG = false;

// ログ出力関数（デバッグモードが有効な場合のみ出力）
const log = (message: string, data?: any) => {
  if (!DEBUG) return;
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

/**
 * UserContextProvider - ユーザー認証と状態管理のためのコンテキストプロバイダー
 */
export const UserContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 状態管理
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [companyId, setCompanyId] = useState<string>('');
  
  // 初期化済みフラグ（複数回の初期化を防止）
  const alreadyInitialised = useRef(false);

  // 初期化処理 - アプリケーション起動時に一度だけ実行
  useEffect(() => {
    // 初期化処理が複数回実行されないようにフラグを確認
    if (isInitialized) return;

    log('[Provider] useEffect: 初期化処理を実行します');
    setIsInitialized(true);

    // 初期データ読み込みロジックを実行
    initializeProvider(
      setCurrentUser,
      setUsers,
      setIsAuthenticated,
      setCompanyId,
      setUserPasswords,
      alreadyInitialised
    ).catch(error => {
      log('[Provider] 初期化中にエラーが発生しました:', error);
    });
  }, [isInitialized]);

  // 認証状態変更リスナーとセッションチェックの設定
  useEffect(() => {
    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined') return;
    
    // 既に初期化済みの場合はスキップ
    if (alreadyInitialised.current) {
      log('[Provider] useEffect: 既に初期化済みのため、処理をスキップします');
      return;
    }
    
    log('[Provider] Setting up auth state change listener');
    
    // 認証状態変更リスナーを設定
    const subscription = setupAuthStateChangeListener(
      currentUser,
      setCurrentUser,
      setUsers,
      setIsAuthenticated,
      setCompanyId,
      alreadyInitialised
    );
    
    // セッションの有効性を定期的にチェック
    const sessionCheckCleanup = setupSessionCheck(
      setCurrentUser,
      setIsAuthenticated,
      setCompanyId
    );
    
    // クリーンアップ関数を返す
    return () => {
      log('[Provider] Cleaning up auth listeners and event handlers');
      if (subscription) subscription.unsubscribe();
      if (sessionCheckCleanup) sessionCheckCleanup();
    };
  }, [currentUser, alreadyInitialised.current]); // currentUserとalreadyInitialised.currentが変更されたときにリスナーを再設定

  /**
   * 最適化されたGoogle認証ログイン関数
   * @returns ログイン成功したかどうか
   */
  const optimizedLogin = useCallback(async (): Promise<boolean> => {
    log('[Provider] Executing optimized login');
    
    try {
      const result = await loginWithGoogle(
        setCurrentUser,
        setUsers,
        setIsAuthenticated
      );
      
      if (result.success && result.user) {
        setCompanyId(result.user.companyId || '');
        log('[Provider] Login successful, company ID set:', result.user.companyId);
      } else {
        log('[Provider] Login failed or no user returned');
      }
      
      return result.success;
    } catch (error) {
      log('[Provider] Login error:', error);
      return false;
    }
  }, []);

  /**
   * 最適化されたログアウト関数
   */
  const optimizedLogout = useCallback(async (): Promise<void> => {
    log('[Provider] Executing optimized logout');
    
    await logout(
      setCurrentUser,
      setIsAuthenticated,
      setCompanyId
    );
  }, []);

  /**
   * 最適化されたユーザー情報更新関数
   * @param userData 更新するユーザー情報
   * @returns 更新成功したかどうか
   */
  const optimizedUpdateUserAfterGoogleSignIn = useCallback(async (userData: Partial<UserInfo>): Promise<boolean> => {
    if (!currentUser) {
      log('[Provider] Cannot update user: No current user');
      return false;
    }
    
    log('[Provider] Updating user after Google sign-in');
    
    const result = await updateUserInfo(
      userData,
      currentUser,
      setCurrentUser,
      setUsers
    );
    
    if (result.success && result.user && userData.companyId) {
      setCompanyId(userData.companyId);
      log('[Provider] User updated successfully, company ID set:', userData.companyId);
    } else {
      log('[Provider] User update failed or no company ID provided');
    }
    
    return result.success;
  }, [currentUser]);

  // ユーザープロファイル更新関数
  const updateUserProfileCallback = useCallback((userData: Partial<UserInfo>) => {
    return updateUserProfile(
      userData,
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords
    );
  }, [currentUser]);

  // ユーザー更新関数
  const updateUserCallback = useCallback((userId: string, userData: Partial<UserInfo>) => {
    return updateUser(
      userId,
      userData,
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords
    );
  }, [currentUser]);

  // ユーザー取得関数
  const getUserByIdCallback = useCallback((id: string) => {
    return getUserById(id, users);
  }, [users]);

  // ユーザー削除関数
  const deleteUserCallback = useCallback((userId: string) => {
    return deleteUser(
      userId,
      currentUser,
      setUsers,
      setUserPasswords
    );
  }, [currentUser]);

  // 会社アカウント削除関数
  const deleteCompanyAccountCallback = useCallback(() => {
    return deleteCompanyAccount(
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    );
  }, [currentUser]);

  // ユーザー招待関数
  const inviteUserCallback = useCallback((inviteData: any) => {
    return inviteUser(
      inviteData,
      currentUser,
      setUsers,
      setUserPasswords
    );
  }, [currentUser]);

  // 招待トークン検証関数
  const verifyInviteTokenCallback = useCallback((token: string) => {
    return verifyInviteToken(token, users, setUsers, setCompanyId);
  }, [users]);

  // 招待完了関数
  const completeInvitationCallback = useCallback((token: string, userData: {fullName: string; companyId?: string}) => {
    return completeInvitation(
      token,
      userData,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    );
  }, []);

  // コンテキスト値の定義
  const value: UserContextType = {
    currentUser,
    users,
    isAuthenticated,
    companyId,
    setCompanyId,
    setUsers,
    
    // 認証関連の操作
    loginWithGoogle: optimizedLogin,
    logout: optimizedLogout,
    updateUserAfterGoogleSignIn: optimizedUpdateUserAfterGoogleSignIn,
    
    // ユーザー管理関連の操作
    updateUserProfile: updateUserProfileCallback,
    updateUser: updateUserCallback,
    getUserById: getUserByIdCallback,
    deleteUser: deleteUserCallback,
    
    // 会社アカウント関連の操作
    deleteCompanyAccount: deleteCompanyAccountCallback,
    
    // 招待関連の操作
    inviteUser: inviteUserCallback,
    verifyInviteToken: verifyInviteTokenCallback,
    completeInvitation: completeInvitationCallback,
    
    // 従業員関連の操作
    getEmployees
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
