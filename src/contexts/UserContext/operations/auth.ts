import { UserInfo, UserStatus } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { getSupabaseClient } from '@/lib/supabaseClient';
import isEqual from 'lodash/isEqual';

// Supabaseを使用したログイン処理
export const loginWithGoogle = async (
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    // 現在のセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Supabase] Session error:', sessionError);
      return false;
    }
    
    if (!session) {
      console.log('[Supabase] No active session');
      return false;
    }
    
    // ユーザー情報を取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[Supabase] User error:', userError);
      return false;
    }
    
    // ローカルストレージからユーザーリストを取得
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, () => ({}));
    
    // ユーザーIDで既存ユーザーを検索
    const existingUser = currentUsers.find(u => u.id === user.id);
    
    // UserInfo形式に変換
    const userInfo: UserInfo = {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      email: user.email || '',
      fullName: user.user_metadata?.full_name || '',
      role: existingUser?.role || '管理者', // 新規ユーザーは管理者として設定
      status: 'アクティブ' as UserStatus,
      createdAt: existingUser?.createdAt || user.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: existingUser?.isInvited || false,
      inviteToken: existingUser?.inviteToken || '',
      companyId: existingUser?.companyId || '' // 既存ユーザーの会社IDを使用、新規ユーザーは空文字
    };
    
    // ユーザー情報を保存
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    
    // ローカルストレージとセッションストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
      
      // セッションストレージにも保存（ページ更新時のログアウト防止）
      try {
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
      } catch (e) {
        console.error('[Supabase] Failed to save to sessionStorage:', e);
      }
      
      // ユーザーリストを更新
      const existingUserIndex = currentUsers.findIndex(u => u.id === userInfo.id);
      
      let updatedUsers;
      if (existingUserIndex >= 0) {
        // 既存ユーザーを更新（会社IDは保持）
        const updatedUser: UserInfo = {
          ...currentUsers[existingUserIndex],
          lastLogin: new Date().toISOString(),
          fullName: userInfo.fullName,
          email: userInfo.email,
          status: 'アクティブ' as UserStatus // ステータスを更新
        };
        updatedUsers = [...currentUsers];
        updatedUsers[existingUserIndex] = updatedUser;
        
        // 現在のユーザー情報も更新
        setCurrentUser(updatedUser);
      } else {
        // 新規ユーザーを追加
        updatedUsers = [...currentUsers, userInfo];
      }
      
      setUsers(updatedUsers);
      
      // 前回保存したデータと比較して変更がある場合のみ保存
      const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
      
      // ローカルストレージから現在のデータを取得
      const currentSavedData = localStorage.getItem(USERS_STORAGE_KEY);
      const currentParsedData = currentSavedData ? JSON.parse(currentSavedData) : [];
      
      // 変更を検出
      if (!isEqual(currentParsedData, usersToSave)) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        
        // セッションストレージにも保存
        try {
          sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        } catch (e) {
          console.error('[Supabase] Failed to save users to sessionStorage:', e);
        }
        console.log('[Supabase] User data updated and saved');
      } else {
        console.log('[Supabase] No changes detected, skipping save');
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Supabase] Login error:', error);
    return false;
  }
};

// ログアウト処理
export const logout = async (
  currentUser: UserInfo | null,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
) => {
  try {
    const supabase = getSupabaseClient();
    
    // Supabaseからログアウト
    await supabase.auth.signOut();
    
    // ローカルの状態をクリア
    setCurrentUser(null);
    setIsAuthenticated(false);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
    
    console.log('[Logout] User logged out successfully');
  } catch (error) {
    console.error('[Logout] Error:', error);
  }
};

// ユーザー登録処理（Googleログイン後のユーザー情報更新用）
export const updateUserAfterGoogleSignIn = async (
  userData: Partial<UserInfo>,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    // 現在のセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Supabase] Session error:', sessionError);
      return false;
    }
    
    // ユーザー情報を取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[Supabase] User error:', userError);
      return false;
    }
    
    // 既存のユーザー情報を取得
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, () => ({}));
    const existingUser = currentUsers.find(u => u.id === user.id);
    
    // UserInfo形式に変換して更新
    const updatedUserInfo: UserInfo = {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      email: user.email || '',
      fullName: user.user_metadata?.full_name || '',
      role: userData.role || existingUser?.role || '管理者', // 新規ユーザーは管理者として設定
      status: 'アクティブ' as UserStatus,
      createdAt: existingUser?.createdAt || user.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: userData.isInvited || existingUser?.isInvited || false,
      inviteToken: userData.inviteToken || existingUser?.inviteToken || '',
      companyId: userData.companyId || existingUser?.companyId || ''
    };
    
    console.log('[updateUserAfterGoogleSignIn] Updating user with company ID:', updatedUserInfo.companyId);
    
    // ユーザー情報を保存
    setCurrentUser(updatedUserInfo);
    setIsAuthenticated(true);
    
    // ローカルストレージとセッションストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUserInfo));
      
      // セッションストレージにも保存（ページ更新時のログアウト防止）
      try {
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUserInfo));
      } catch (e) {
        console.error('[Supabase] Failed to save to sessionStorage:', e);
      }
      
      // ユーザーリストを更新
      const existingUserIndex = currentUsers.findIndex(u => u.id === updatedUserInfo.id);
      
      let updatedUsers;
      if (existingUserIndex >= 0) {
        // 既存ユーザーを更新
        updatedUsers = [...currentUsers];
        updatedUsers[existingUserIndex] = updatedUserInfo;
      } else {
        // 新規ユーザーを追加
        updatedUsers = [...currentUsers, updatedUserInfo];
      }
      
      setUsers(updatedUsers);
      
      // 前回保存したデータと比較して変更がある場合のみ保存
      const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
      
      // ローカルストレージから現在のデータを取得
      const currentSavedData = localStorage.getItem(USERS_STORAGE_KEY);
      const currentParsedData = currentSavedData ? JSON.parse(currentSavedData) : [];
      
      // 変更を検出
      if (!isEqual(currentParsedData, usersToSave)) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        
        // セッションストレージにも保存
        try {
          sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        } catch (e) {
          console.error('[Supabase] Failed to save users to sessionStorage:', e);
        }
        console.log('[Supabase] User data updated and saved');
      } else {
        console.log('[Supabase] No changes detected, skipping save');
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Supabase] Update user error:', error);
    return false;
  }
};
