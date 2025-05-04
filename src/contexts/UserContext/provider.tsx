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
  verifyInviteToken,
  completeInvitation
} from './operations/index';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { isUserInvited, needsInviteFlow } from '@/utils/userHelpers';

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
  
  // URLから招待トークンを取得する関数
  const getInviteTokenFromURL = (): string => {
    if (typeof window === 'undefined') return '';
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('token') || '';
    } catch (error) {
      console.error('[Provider] Error parsing URL params:', error);
      return '';
    }
  };
  
  // URLから招待トークンを取得
  const urlToken = useRef<string>(getInviteTokenFromURL());
  
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
        
        // 会社IDをメタデータから取得
        const cid = session.user?.user_metadata?.company_id ?? '';
        setCompanyId(cid);
        console.log('[Provider] Company ID from metadata:', cid);
        
        // JWT側のcompany_idと招待company_idが違えば強制signOut
        const urlParams = new URLSearchParams(window.location.search);
        const invitedCompanyId = urlParams.get('companyId') || sessionStorage.getItem('invite_company_id') || '';
        
        if (urlToken.current && invitedCompanyId && cid && cid !== invitedCompanyId) {
          console.log('[Provider] Company ID mismatch, signing out:', { jwt: cid, invited: invitedCompanyId });
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error('[Provider] Error checking Supabase session:', error);
        return;
      }
    };
    
    checkSupabaseSession();
    
    if (typeof window !== 'undefined') {
      // 招待リンクで来た場合はsessionStorageを使わない
      let loadedUsers: UserInfo[] = [];
      
      if (!urlToken.current) {
        // 通常ログインの場合のみsessionStorageを復元
        const { users: restoredUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
        loadedUsers = restoredUsers;
      } else {
        console.log('[Provider] Invite link detected, not using sessionStorage');
        // ローカルストレージからのみ読み込む
        try {
          const storedData = localStorage.getItem(USERS_STORAGE_KEY);
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            loadedUsers = parsedData.map((item: any) => item.user);
          }
        } catch (e) {
          console.error('[Provider] Failed to load from localStorage:', e);
        }
      }
      
      console.log('[Provider] Loaded users:', loadedUsers.length);
      setUsers(loadedUsers);
      
      // URLからcompanyIdを取得
      let inviteCompanyId = '';
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        inviteCompanyId = urlParams.get('companyId') || sessionStorage.getItem('invite_company_id') || '';
      }
      
      // 会社IDが一致するユーザーのみをフィルタリング
      if (inviteCompanyId) {
        const filtered = loadedUsers.filter(u => u.companyId === inviteCompanyId);
        // companyIdが違うレコードは保存させない
        if (filtered.length !== loadedUsers.length) {
          console.log('[Provider] ✂️ Purge other-company users');
          const usersToSave = filtered.map(u => ({ user: u, password: '' }));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          try {
            sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          } catch (e) {
            console.error('[Provider] Failed to save filtered users to sessionStorage:', e);
          }
          setUsers(filtered);
        }
      }
      
      // 招待中のユーザーを確認
      const invitedUsers = loadedUsers.filter(isUserInvited);
      console.log('[Provider] Invited users:', invitedUsers.length);
      
      // 招待中のユーザーの詳細をログに出力
      invitedUsers.forEach((user, index) => {
        console.log(`[Provider] Invited user ${index}:`, {
          id: user.id,
          email: user.email,
          inviteToken: user.inviteToken,
          status: user.status
        });
      });
      
      // クライアントサイドでのみURLパラメータから招待トークンを取得
      if (typeof window !== 'undefined') {
        let urlToken = '';
        try {
          const urlParams = new URLSearchParams(window.location.search);
          urlToken = urlParams.get('token') || '';
          if (urlToken) {
            console.log('[Provider] URL token found:', urlToken);
            
            // トークンをセッションストレージに保存（一時的に）
            sessionStorage.setItem('invite_token', urlToken);
            
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
          
          // 会社IDも取得して保存
          const urlCompanyId = urlParams.get('companyId') || '';
          if (urlCompanyId) {
            console.log('[Provider] URL company ID found:', urlCompanyId);
            sessionStorage.setItem('invite_company_id', urlCompanyId);
            setCompanyId(urlCompanyId);
          }
        } catch (error) {
          console.error('[Provider] Error parsing URL params:', error);
        }
      }
      
      // 招待リンクで来た場合は、セッションストレージからユーザー情報を復元しない
      if (!urlToken.current) {
        // 通常ログインの場合のみセッションストレージからユーザー情報を復元
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
            
            // 会社IDを設定
            if (savedUserInfo.companyId) {
              setCompanyId(savedUserInfo.companyId);
            }
            
            console.log('[Provider Init] Restored current user:', savedUserInfo.email);
          } else {
            // ユーザーリストに存在しない場合でも、クリアせずに使用する
            console.warn('[Provider Init] Saved current user not found in user list. Using anyway.');
            if (!savedUserInfo.status) {
              savedUserInfo.status = 'アクティブ';
            }
            setCurrentUser(savedUserInfo);
            setIsAuthenticated(true);
            
            // 会社IDを設定
            if (savedUserInfo.companyId) {
              setCompanyId(savedUserInfo.companyId);
            }
            
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
      } else {
        console.log('[Provider Init] Invite link detected, not restoring user from storage');
      }
      
      // Supabaseのセッションを確認
      const checkSupabaseSession = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('[Provider] Supabase session found, updating user info');
            await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
            
            // 会社IDをメタデータから取得
            const cid = session.user?.user_metadata?.company_id ?? '';
            setCompanyId(cid);
            console.log('[Provider] Company ID from metadata:', cid);
          }
        } catch (error) {
          console.error('[Provider] Error checking Supabase session:', error);
        }
      };
      
      checkSupabaseSession();
    }
  }, []);

  // inviteTokenが一致するユーザーだけcurrentUserにする
  useEffect(() => {
    if (urlToken.current) {
      const matchingUser = users.find(u => u.inviteToken === urlToken.current);
      if (matchingUser) {
        console.log('[Provider] Setting current user to matching invite token user:', matchingUser.email);
        setCurrentUser(matchingUser);
        setIsAuthenticated(true);
      } else {
        console.log('[Provider] No user found with matching invite token:', urlToken.current);
      }
    } else if (users.length > 0 && !currentUser) {
      console.log('[Provider] No invite token, setting current user to first user:', users[0].email);
      setCurrentUser(users[0]);
      setIsAuthenticated(true);
    }
  }, [users, currentUser]);

  // 招待ユーザーの処理
  useEffect(() => {
    // 現在のユーザーがいない場合は何もしない
    if (!currentUser) return;
    
    // 招待フローが必要かどうかを判断
    if (needsInviteFlow(currentUser)) {
      console.log('[Provider] Current user is invited, processing invite flow');
      
      // トークンを取得（URLパラメータ → セッションストレージ → ユーザー情報の順）
      let token = '';
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token') || sessionStorage.getItem('invite_token') || currentUser.inviteToken || '';
      }
      
      if (token) {
        console.log('[Provider] Processing invite token:', token);
        
        // 既に処理済みかどうかをチェック（追加）
        const processedToken = sessionStorage.getItem('processed_invite_token');
        if (processedToken === token) {
          console.log('[Provider] Token already processed, skipping verification');
          return;
        }
        
        verifyInviteToken(token, users, setUsers, setCompanyId)
          .then(result => {
              if (result.valid) {
                console.log('[Provider] Invite token verified successfully');
                // 処理済みとしてマーク（追加）
                sessionStorage.setItem('processed_invite_token', token);
                
                // 会社IDを明示的に保存（追加）
                const company_id = result.company_id;
                if (company_id) {
                  console.log('[Provider] Setting company ID from verification:', company_id);
                  setCompanyId(company_id);
                  sessionStorage.setItem('company_id', company_id);
                  localStorage.setItem('company_id', company_id);
                  
                  // 現在のユーザーの会社IDも更新
                  if (currentUser) {
                    const updatedUser = {
                      ...currentUser,
                      companyId: company_id
                    };
                    setCurrentUser(updatedUser);
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
                    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
                  }
                  
                  // ユーザーリストをフィルタリング - 会社IDが一致するユーザーのみを保持
                  const filteredUsers = users.filter(u => u.companyId === company_id);
                  if (filteredUsers.length !== users.length) {
                    console.log('[Provider] ✂️ Filtering users by company ID:', company_id);
                    setUsers(filteredUsers);
                    
                    // ローカルストレージとセッションストレージに保存
                    const usersToSave = filteredUsers.map(u => ({ user: u, password: '' }));
                    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
                    try {
                      sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
                    } catch (e) {
                      console.error('[Provider] Failed to save filtered users to sessionStorage:', e);
                    }
                  }
                }
            } else {
              console.error('[Provider] Failed to verify invite token:', result.error);
            }
          })
          .catch(error => {
            console.error('[Provider] Error verifying invite token:', error);
          });
      } else {
        console.warn('[Provider] No invite token found for invited user');
      }
    }
  }, [currentUser, users]);

  // コンテキスト値
  const value: UserContextType = {
    currentUser,
    users,
    isAuthenticated,
    companyId,       // 追加
    setCompanyId,    // 追加
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
    verifyInviteToken: (token) => verifyInviteToken(token, users, setUsers, setCompanyId), // 引数を追加
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
