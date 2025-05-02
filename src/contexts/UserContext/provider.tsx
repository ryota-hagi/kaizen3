'use client'

import React, { useState, useEffect, ReactNode, useRef } from 'react'
import isEqual from 'lodash/isEqual'
import { UserInfo } from '@/utils/api';
import { UserContext, UserContextType, defaultUserContext } from './context';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from './utils';
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
import { getSupabaseClient } from '@/lib/supabaseClient';

// プロバイダーコンポーネント
export const UserContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null); // 初期値はnull
  const [users, setUsers] = useState<UserInfo[]>([]); // 初期値は空配列
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({}); // 初期値は空オブジェクト
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // 初期値はfalse
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // 初期化フラグ
  const lastSavedUsers = useRef<UserInfo[]>([]); // 最後に保存したユーザーデータを保持するref

  // 初期化時にローカルストレージとセッションストレージからデータを読み込む（マウント時のみ実行）
  useEffect(() => {
    // 初期化処理が複数回実行されないようにフラグを確認
    if (isInitialized) {
      console.log('[Provider] useEffect: 既に初期化済みのため、処理をスキップします');
      return;
    }
    
    console.log('[Provider] useEffect: 初期化処理を実行します');
    setIsInitialized(true);
  }, []); // 空の依存配列で初期化処理は1回だけ実行

  // Supabaseのセッションが変わった時だけユーザーデータを再読み込み
  useEffect(() => {
    // セッショントークンが変わった時だけ実行するように依存配列を設定
    const supabase = getSupabaseClient();
    
    // セッション監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        console.log('[Provider] Auth state changed:', event);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('[Provider] User signed in/out, reloading user data');
          // ユーザーデータを再読み込み
          loadUserDataFromLocalStorage(setUsers, setUserPasswords);
        }
      }
    );
    
    // クリーンアップ関数
    return () => {
      subscription.unsubscribe();
    };
  }, []); // 空の依存配列で初期化時のみ実行
  
  // 初期データ読み込み
  useEffect(() => {
    const checkSupabaseSession = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('[Provider] No active Supabase session');
          return;
        }
        
        console.log('[Provider] Supabase session found, loading user data');
      } catch (error) {
        console.error('[Provider] Error checking Supabase session:', error);
        return;
      }
    };
    
    checkSupabaseSession();
    
    if (typeof window !== 'undefined') {
      // ユーザーデータを読み込む
      const { users: loadedUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
      console.log('[Provider] Loaded users:', loadedUsers.length);
      
      // 招待中のユーザーを確認
      const invitedUsers = loadedUsers.filter(user => user.status === '招待中' || user.isInvited === true);
      console.log('[Provider] Invited users:', invitedUsers.length);
      
      // 招待中のユーザーの詳細をログに出力
      invitedUsers.forEach((user, index) => {
        console.log(`[Provider] Invited user ${index}:`, {
          id: user.id,
          email: user.email,
          inviteToken: user.inviteToken,
          status: user.status,
          isInvited: user.isInvited
        });
      });
      
      // URLパラメータから招待トークンを取得（存在する場合）
      let urlToken = '';
      const urlParams = new URLSearchParams(window.location.search);
      urlToken = urlParams.get('token') || '';
      if (urlToken) {
        console.log('[Provider] URL token found:', urlToken);
        
        // トークンに一致するユーザーを検索
        const matchingUser = loadedUsers.find(user => user.inviteToken === urlToken);
        if (matchingUser) {
          console.log('[Provider] Found user with matching token:', matchingUser.email);
        } else {
          console.log('[Provider] No user found with matching token');
          
          // 全ユーザーのトークンをログに出力
          loadedUsers.forEach((user, index) => {
            console.log(`[Provider] User ${index} token:`, user.inviteToken);
          });
        }
      }
      
      // 現在ログイン中のユーザー情報を復元（セッションストレージを優先）
      let savedUserInfo = null;
      
      // まずセッションストレージから取得を試みる
      try {
        const sessionUserInfo = sessionStorage.getItem(USER_STORAGE_KEY);
        if (sessionUserInfo) {
          savedUserInfo = JSON.parse(sessionUserInfo);
          console.log('[Provider Init] Restored user from sessionStorage');
        }
      } catch (error) {
        console.error('[Provider Init] Failed to parse user from sessionStorage:', error);
      }
      
      // セッションストレージになければローカルストレージから取得
      if (!savedUserInfo) {
        try {
          const localUserInfo = localStorage.getItem(USER_STORAGE_KEY);
          if (localUserInfo) {
            savedUserInfo = JSON.parse(localUserInfo);
            console.log('[Provider Init] Restored user from localStorage');
            
            // セッションストレージにも保存（ページ更新時のログアウト防止）
            try {
              sessionStorage.setItem(USER_STORAGE_KEY, localUserInfo);
            } catch (e) {
              console.error('[Provider Init] Failed to save to sessionStorage:', e);
            }
          }
        } catch (error) {
          console.error('[Provider Init] Failed to parse user from localStorage:', error);
        }
      }
      
      if (savedUserInfo) {
        // 保存されているユーザーが実際にリストに存在するか確認
        if (loadedUsers.some(u => u.id === savedUserInfo.id)) {
          if (!savedUserInfo.status) {
            savedUserInfo.status = 'アクティブ';
          }
          setCurrentUser(savedUserInfo);
          setIsAuthenticated(true);
          console.log('[Provider Init] Restored current user:', savedUserInfo.email);
        } else {
          // ユーザーリストに存在しない場合でも、クリアせずに使用する
          console.warn('[Provider Init] Saved current user not found in user list. Using anyway.');
          if (!savedUserInfo.status) {
            savedUserInfo.status = 'アクティブ';
          }
          setCurrentUser(savedUserInfo);
          setIsAuthenticated(true);
          
          // ユーザーリストに追加
          const updatedUsers = [...loadedUsers, savedUserInfo];
          setUsers(updatedUsers);
          lastSavedUsers.current = updatedUsers; // 最後に保存したユーザーデータを記録
          
          // ローカルストレージとセッションストレージに保存
          const usersToSave = updatedUsers.map(u => ({
            user: u,
            password: ''
          }));
          
          // 変更がある場合のみ保存
          if (!isEqual(lastSavedUsers.current, updatedUsers)) {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
            try {
              sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
            } catch (e) {
              console.error('[Provider Init] Failed to save users to sessionStorage:', e);
            }
            console.log('[Provider Init] Added current user to user list:', savedUserInfo.email);
          }
        }
      }
      
      // Supabaseのセッションを確認
      const checkSupabaseSession = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('[Provider] Supabase session found, updating user info');
            await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
          }
        } catch (error) {
          console.error('[Provider] Error checking Supabase session:', error);
        }
      };
      
      checkSupabaseSession();
    }
  }, []);

  // コンテキスト値
  const value: UserContextType = {
    currentUser,
    users,
    isAuthenticated,
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
    verifyInviteToken: (token) => verifyInviteToken(token, users), // 非同期関数として呼び出し
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
