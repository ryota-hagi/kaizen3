'use client'

import React, { useState, useEffect, ReactNode, useRef } from 'react'
import { UserInfo } from '@/utils/api';
import { UserContext, UserContextType } from './context';
import { USER_STORAGE_KEY } from './utils';
import {
  loginWithGoogle,
  logout,
  updateUserAfterGoogleSignIn,
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
import { supabase } from '@/lib/supabaseClient';
import { 
  initializeProvider, 
  setupAuthStateChangeListener,
  setupSessionCheck
} from './provider/index';

// プロバイダーコンポーネント
export const UserContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null); // 初期値はnull
  const [users, setUsers] = useState<UserInfo[]>([]); // 初期値は空配列
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({}); // 初期値は空オブジェクト
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // 初期値はfalse
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // 初期化フラグ
  const [companyId, setCompanyId] = useState<string>(''); // 追加: 会社ID
  const alreadyInitialised = useRef(false); // 初期化フラグ

  // 初期化時にローカルストレージとセッションストレージからデータを読み込む（マウント時のみ実行）
  useEffect(() => {
    // 初期化処理が複数回実行されないようにフラグを確認
    if (isInitialized) {
      console.log('[Provider] useEffect: 既に初期化済みのため、処理をスキップします');
      return;
    }

    console.log('[Provider] useEffect: 初期化処理を実行します');
    setIsInitialized(true);

    // 初期データ読み込みロジックを実行
    initializeProvider(
      setCurrentUser,
      setUsers,
      setIsAuthenticated,
      setCompanyId,
      setUserPasswords
    );
  }, [isInitialized]); // isInitialized を依存配列に追加

  // currentUser と companyInfo の不整合チェック
  useEffect(() => {
    if (currentUser && currentUser.companyId && typeof window !== 'undefined') {
      try {
        const storedCompanyInfoStr = localStorage.getItem('kaizen_company_info'); // 実際のキーを使用
        if (storedCompanyInfoStr) {
          const storedCompanyInfo = JSON.parse(storedCompanyInfoStr);
          if (storedCompanyInfo && storedCompanyInfo.id !== currentUser.companyId) {
            console.warn('[Provider] Company info mismatch detected! Clearing stored company info and refetching.');
            localStorage.removeItem('kaizen_company_info'); // 不正な情報を削除
          }
        }
      } catch (error) {
        console.error('[Provider] Error checking company info consistency:', error);
      }
    }
  }, [currentUser]); // currentUser が変更されたときにチェック

  // 認証状態変更リスナーを設定
  useEffect(() => {
    const subscription = setupAuthStateChangeListener(
      currentUser,
      setCurrentUser,
      setUsers,
      setIsAuthenticated,
      setCompanyId,
      alreadyInitialised
    );

    // セッションの有効性を定期的にチェック
    const intervalId = setupSessionCheck(
      setCurrentUser,
      setIsAuthenticated,
      setCompanyId
    );

    return () => {
      console.log('[Provider] Unsubscribing from onAuthStateChange'); // クリーンアップログ
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [currentUser]); // currentUserの変更でも再実行が必要なロジックがあるため、一旦残す

  // コンテキスト値
  const value: UserContextType = {
    currentUser,
    users,
    isAuthenticated,
    companyId,
    setCompanyId,
    setUsers, // setUsers関数を追加
    loginWithGoogle: () => loginWithGoogle(
      setCurrentUser,
      setUsers,
      setIsAuthenticated
    ),
    logout: () => logout(
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    ),
    updateUserAfterGoogleSignIn: (userData) => updateUserAfterGoogleSignIn(
      userData,
      setCurrentUser,
      setUsers,
      setIsAuthenticated
    ),
    updateUserProfile: (userData) => updateUserProfile(
      userData,
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords
    ),
    updateUser: (userId, userData) => updateUser(
      userId,
      userData,
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords
    ),
    getUserById: (id) => getUserById(id, users),
    deleteUser: (userId) => deleteUser(
      userId,
      currentUser,
      setUsers,
      setUserPasswords
    ),
    deleteCompanyAccount: () => deleteCompanyAccount(
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    ),
    inviteUser: (inviteData) => inviteUser(
      inviteData,
      currentUser,
      setUsers,
      setUserPasswords
    ),
    verifyInviteToken: (token) => verifyInviteToken(token, users, setUsers, setCompanyId),
    completeInvitation: (token, userData) => completeInvitation(
      token,
      userData,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    ),
    getEmployees
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
