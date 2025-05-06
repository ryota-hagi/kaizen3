import { Dispatch, SetStateAction } from 'react';
import { UserInfo } from '@/utils/api';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { supabase } from '@/lib/supabaseClient';

// 初期化処理を行う関数
export const initializeProvider = async (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>
) => {
  if (typeof window === 'undefined') return;

  // 1. Supabaseセッションを確認
  const client = supabase();
  let sessionUser = null;
  let sessionCompanyId = '';
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      console.log('[Provider Init] Supabase session found.');
      sessionUser = session.user;
      sessionCompanyId = session.user?.user_metadata?.company_id ?? '';
      setCompanyId(sessionCompanyId); // メタデータから会社IDを設定
      console.log('[Provider Init] Company ID from metadata:', sessionCompanyId);
    } else {
      console.log('[Provider Init] No active Supabase session.');
      
      // セッションがない場合はローカルストレージのユーザー情報をクリア
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      console.log('[Provider Init] Cleared user data from storage due to no active session.');
      
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCompanyId('');
      return; // セッションがない場合は早期リターン
    }
  } catch (error) {
    console.error('[Provider Init] Error checking Supabase session:', error);
    // エラーが発生した場合もローカルストレージをクリア
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCompanyId('');
    return;
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

  // Supabaseセッションとローカルストレージのユーザー情報の整合性チェック
  if (savedUserInfo && sessionUser) {
    if (savedUserInfo.id !== sessionUser.id) {
      console.warn('[Provider Init] User ID mismatch between storage and session. Clearing storage.');
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      savedUserInfo = null;
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
        const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
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
    console.log('[Provider Init] No user in storage, but Supabase session exists. Setting authenticated.');
    setIsAuthenticated(true);
    // セッションからユーザー情報を取得して設定
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
        setCurrentUser(userInfo);
        setCompanyId(userInfo.companyId);
        
        // ストレージに保存
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
        try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo)); } catch(e){}
        
        // ユーザーリストに追加
        const updatedUsers = [...loadedUsers, userInfo];
        setUsers(updatedUsers);
        const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        try { sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave)); } catch(e){}
      }
    } catch (error) {
      console.error('[Provider Init] Error getting user from session:', error);
    }
  } else {
    console.log('[Provider Init] No user in storage and no Supabase session.');
    setCurrentUser(null);
    setIsAuthenticated(false);
  }
};

// セッションが切れた場合の自動ログアウト処理
export const handleSessionExpired = (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) => {
  console.log('[Auth] Session expired, logging out.');
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  setCurrentUser(null);
  setIsAuthenticated(false);
  setCompanyId('');
};
