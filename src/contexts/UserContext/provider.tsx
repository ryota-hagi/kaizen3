'use client'

import React, { useState, useEffect, ReactNode, useRef } from 'react'
import { isEqual } from '@/utils/deepEqual'
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
  verifyInviteToken, // ★ verifyInviteToken はまだ他の場所で使われる可能性があるので残す
  completeInvitation
} from './operations/index';
import { getSupabaseClient } from '@/lib/supabaseClient';
// import { isUserInvited, needsInviteFlow } from '@/utils/userHelpers'; // ★ 不要になったインポートを削除

// プロバイダーコンポーネント
export const UserContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null); // 初期値はnull
  const [users, setUsers] = useState<UserInfo[]>([]); // 初期値は空配列
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({}); // 初期値は空オブジェクト
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // 初期値はfalse
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // 初期化フラグ
  const [companyId, setCompanyId] = useState<string>(''); // 追加: 会社ID
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

    // ★★★ 初期データ読み込みロジックをここに集約 ★★★
    const initializeProvider = async () => {
      if (typeof window === 'undefined') return;

      // 1. Supabaseセッションを確認
      const supabase = getSupabaseClient();
      let sessionUser = null;
      let sessionCompanyId = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Provider Init] Supabase session found.');
          sessionUser = session.user;
          sessionCompanyId = session.user?.user_metadata?.company_id ?? '';
          setCompanyId(sessionCompanyId); // メタデータから会社IDを設定
          console.log('[Provider Init] Company ID from metadata:', sessionCompanyId);
        } else {
          console.log('[Provider Init] No active Supabase session.');
        }
      } catch (error) {
        console.error('[Provider Init] Error checking Supabase session:', error);
      }

      // 2. ローカルストレージ/セッションストレージからユーザー情報を読み込む
      let loadedUsers: UserInfo[] = [];
      let savedUserInfo: UserInfo | null = null;

      // まずセッションストレージから currentUser を試みる
      try {
        const sessionUserInfoStr = sessionStorage.getItem(USER_STORAGE_KEY);
        if (sessionUserInfoStr) {
          savedUserInfo = JSON.parse(sessionUserInfoStr);
          console.log('[Provider Init] Restored potential currentUser from sessionStorage:', savedUserInfo?.email);
        }
      } catch (error) {
        console.error('[Provider Init] Failed to parse currentUser from sessionStorage:', error);
      }

      // セッションになければローカルストレージから currentUser を試みる
      if (!savedUserInfo) {
        try {
          const localUserInfoStr = localStorage.getItem(USER_STORAGE_KEY);
          if (localUserInfoStr) {
            savedUserInfo = JSON.parse(localUserInfoStr);
            console.log('[Provider Init] Restored potential currentUser from localStorage:', savedUserInfo?.email);
            // セッションにも保存
            try {
              sessionStorage.setItem(USER_STORAGE_KEY, localUserInfoStr);
            } catch (e) {
              console.error('[Provider Init] Failed to save currentUser to sessionStorage:', e);
            }
          }
        } catch (error) {
          console.error('[Provider Init] Failed to parse currentUser from localStorage:', error);
        }
      }

      // USERS_STORAGE_KEY からユーザーリストを読み込む
      try {
        const storedUsersStr = localStorage.getItem(USERS_STORAGE_KEY);
        if (storedUsersStr) {
          const parsedData = JSON.parse(storedUsersStr) as { user: UserInfo, password?: string }[];
          // nullチェックを追加
          loadedUsers = parsedData.map(item => item.user).filter(user => user != null);
          console.log('[Provider Init] Loaded users from localStorage:', loadedUsers.length);
          setUsers(loadedUsers); // ユーザーリストをstateに設定
          lastSavedUsers.current = loadedUsers; // 初期ロード時のデータを記録

           // パスワード情報も復元 (必要であれば)
           const loadedPasswords = parsedData.reduce((acc, item) => {
             if (item.user && item.user.id && item.password) {
               acc[item.user.id] = item.password;
             }
             return acc;
           }, {} as Record<string, string>);
           setUserPasswords(loadedPasswords);

        } else {
           console.log('[Provider Init] No users found in localStorage.');
        }
      } catch (error) {
        console.error('[Provider Init] Failed to parse users from localStorage:', error);
      }

      // 3. currentUser を確定
      if (savedUserInfo) {
        // 保存されていたユーザーがリストに存在するか、またはSupabaseセッションと一致するか確認
        const userExistsInList = loadedUsers.some(u => u.id === savedUserInfo!.id);
        const sessionMatchesSaved = sessionUser && sessionUser.id === savedUserInfo.id;

        if (userExistsInList || sessionMatchesSaved) {
           // ステータスがなければアクティブに
           if (!savedUserInfo.status) {
             savedUserInfo.status = 'アクティブ';
           }
           // 会社IDがなければセッションから取得したものを設定
           if (!savedUserInfo.companyId && sessionCompanyId) {
               savedUserInfo.companyId = sessionCompanyId;
           }
           setCurrentUser(savedUserInfo);
           setIsAuthenticated(true);
           setCompanyId(savedUserInfo.companyId || sessionCompanyId); // 会社IDも確定
           console.log('[Provider Init] Set current user:', savedUserInfo.email);

           // リストに存在しないがセッションとは一致する場合、リストに追加する
           if (!userExistsInList && sessionMatchesSaved) {
               console.warn('[Provider Init] Current user from storage not in list, but matches session. Adding to list.');
               const updatedUsers = [...loadedUsers, savedUserInfo];
               setUsers(updatedUsers);
               lastSavedUsers.current = updatedUsers;
               const usersToSave = updatedUsers.map(u => ({ user: u, password: userPasswords[u.id] || '' }));
               localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
               try { sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave)); } catch(e){}
           }

        } else {
          console.warn('[Provider Init] Saved user info does not match session or user list. Clearing.');
          localStorage.removeItem(USER_STORAGE_KEY);
          sessionStorage.removeItem(USER_STORAGE_KEY);
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } else if (sessionUser) {
          // ストレージにcurrentUserはないが、Supabaseセッションがある場合
          // loginWithGoogle相当の処理を行うか、あるいは単に認証済みとするか
          // ここではシンプルに認証済みとし、詳細はloginWithGoogleに任せる
          console.log('[Provider Init] No user in storage, but Supabase session exists. Setting authenticated.');
          setIsAuthenticated(true);
          // 必要であれば、ここで sessionUser 情報から仮の currentUser を設定することも可能
          // setCurrentUser({ ... basic user info from sessionUser ... });
      } else {
          console.log('[Provider Init] No user in storage and no Supabase session.');
          setCurrentUser(null);
          setIsAuthenticated(false);
      }

    };

    initializeProvider();

  }, [isInitialized]); // isInitialized を依存配列に追加

  // Supabaseの認証状態変更を監視
  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Provider] Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN') {
          console.log('[Provider] User SIGNED_IN, attempting to update user info...');
          // loginWithGoogle内でユーザー情報取得・設定・保存を行う
          await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
          // セッションから会社IDを再取得・設定
          const cid = session?.user?.user_metadata?.company_id ?? '';
          setCompanyId(cid);
          console.log('[Provider] Company ID updated from SIGNED_IN event:', cid);
        } else if (event === 'SIGNED_OUT') {
          console.log('[Provider] User SIGNED_OUT, clearing state.');
          setCurrentUser(null);
          setIsAuthenticated(false);
          setCompanyId(''); // 会社IDもクリア
          // ストレージクリアは logout 関数内で行う想定
        } else if (event === 'USER_UPDATED') {
            console.log('[Provider] User data UPDATED in Supabase.');
            // 必要に応じて currentUser や users リストを更新
            if (session?.user && currentUser && session.user.id === currentUser.id) {
                const metaCompanyId = session.user.user_metadata?.company_id ?? '';
                if (metaCompanyId !== currentUser.companyId) {
                    console.log('[Provider] Updating companyId based on USER_UPDATED event.');
                    const updatedCurrentUser = { ...currentUser, companyId: metaCompanyId };
                    setCurrentUser(updatedCurrentUser);
                    setCompanyId(metaCompanyId);
                    // ストレージにも反映
                     localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrentUser));
                     try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrentUser)); } catch(e){}
                }
            }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]); // currentUser を依存配列に追加してメタデータ更新に対応


  // ★★★ 招待関連の useEffect は削除 ★★★


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
    // verifyInviteToken は招待フロー専用ページで使われるため、Contextからは削除しても良いかもしれないが、
    // 他の場所で使われている可能性を考慮して一旦残す。ただし、実装はAPI呼び出しに依存すべき。
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
