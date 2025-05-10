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

    // セッションの検証と復元を強化
    const restoreSession = async () => {
      try {
        // セッションの検証
        const { validateSession } = await import('@/lib/supabaseClient');
        const { valid, session } = await validateSession();
        
        if (valid && session) {
          console.log('[Provider] Valid session found during initialization');
          // 認証状態を設定
          setIsAuthenticated(true);
          
          // セッションから会社IDを設定
          if (session.user?.user_metadata?.company_id) {
            const cid = session.user.user_metadata.company_id;
            setCompanyId(cid);
            console.log('[Provider] Company ID updated from session:', cid);
          }
        }
        
        // 初期データ読み込みロジックを実行（alreadyInitialisedフラグを渡す）
        await initializeProvider(
          setCurrentUser,
          setUsers,
          setIsAuthenticated,
          setCompanyId,
          setUserPasswords,
          alreadyInitialised
        );
      } catch (error) {
        console.error('[Provider] Error restoring session:', error);
        
        // エラーが発生した場合でも初期化処理は実行
        await initializeProvider(
          setCurrentUser,
          setUsers,
          setIsAuthenticated,
          setCompanyId,
          setUserPasswords,
          alreadyInitialised
        );
      }
    };
    
    restoreSession();
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
    console.log('[Provider] Setting up auth state change listener');
    
    // 既存のリスナーをクリーンアップ
    let subscription: { unsubscribe: () => void } | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined') {
      // セッションの復元を試みる
      const attemptSessionRestore = async () => {
        try {
          // Supabaseクライアントを取得
          const client = supabase();
          
          // セッションの取得を試みる
          const { data: { session }, error } = await client.auth.getSession();
          
          if (error) {
            console.error('[Provider] Error getting session:', error);
            return;
          }
          
          if (session) {
            console.log('[Provider] Found existing session during listener setup');
            setIsAuthenticated(true);
            
            // セッションから会社IDを設定
            if (session.user?.user_metadata?.company_id) {
              const cid = session.user.user_metadata.company_id;
              setCompanyId(cid);
              console.log('[Provider] Company ID updated from session:', cid);
            }
            
            // ユーザー情報がない場合は取得
            if (!currentUser) {
              try {
                const { data: { user } } = await client.auth.getUser();
                if (user) {
                  const userInfo: UserInfo = {
                    id: user.id,
                    username: user.email?.split('@')[0] || '',
                    email: user.email || '',
                    fullName: user.user_metadata?.full_name || '',
                    role: user.user_metadata?.role || '一般ユーザー',
                    status: 'アクティブ',
                    createdAt: user.created_at || new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    isInvited: false,
                    inviteToken: '',
                    companyId: user.user_metadata?.company_id || ''
                  };
                  
                  // ユーザー情報を設定
                  setCurrentUser(userInfo);
                  
                  // ストレージに保存
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
                  try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo)); } catch(e){}
                  
                  console.log('[Provider] User info restored from session:', userInfo.email);
                }
              } catch (error) {
                console.error('[Provider] Error getting user from session:', error);
              }
            }
          }
        } catch (error) {
          console.error('[Provider] Error during session restore attempt:', error);
        }
      };
      
      // セッションの復元を試みる
      attemptSessionRestore();
      
      // 認証状態変更リスナーを設定
      subscription = setupAuthStateChangeListener(
        currentUser,
        setCurrentUser,
        setUsers,
        setIsAuthenticated,
        setCompanyId,
        alreadyInitialised
      );
      
      // セッションの有効性を定期的にチェック
      intervalId = setupSessionCheck(
        setCurrentUser,
        setIsAuthenticated,
        setCompanyId
      );
      
      // ページの可視性変更イベントリスナーを追加
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('[Provider] Page became visible, checking session');
          attemptSessionRestore();
        }
      };
      
      // ページの可視性変更イベントリスナーを追加
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // ブラウザの更新前イベントリスナーを追加
      const handleBeforeUnload = () => {
        // 現在のユーザー情報があれば保存
        if (currentUser) {
          console.log('[Provider] Page about to unload, saving user info');
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
          try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser)); } catch(e){}
        }
      };
      
      // ブラウザの更新前イベントリスナーを追加
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // クリーンアップ関数を拡張
      return () => {
        console.log('[Provider] Cleaning up auth listeners and event handlers');
        if (subscription) subscription.unsubscribe();
        if (intervalId) clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
    
    // ブラウザ環境でない場合は空のクリーンアップ関数を返す
    return () => {};
  }, [currentUser]); // currentUserが変更されたときにリスナーを再設定

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
