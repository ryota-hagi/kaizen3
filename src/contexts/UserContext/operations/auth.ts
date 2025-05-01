import { UserInfo } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { getSupabaseClient } from '@/lib/supabaseClient';

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
    const existingUser = currentUsers.find(u => u.id === user.id);
    
    // UserInfo形式に変換
    const userInfo: UserInfo = {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      email: user.email || '',
      fullName: user.user_metadata?.full_name || '',
      role: existingUser?.role || 'ユーザー',
      status: 'アクティブ',
      createdAt: existingUser?.createdAt || user.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: existingUser?.isInvited || false,
      inviteToken: existingUser?.inviteToken || '',
      companyId: existingUser?.companyId || '' // 既存ユーザーの会社IDを使用、新規ユーザーは空文字
    };
    
    // ユーザー情報を保存
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
      
      // ユーザーリストを更新
      const existingUserIndex = currentUsers.findIndex(u => u.id === userInfo.id);
      
      let updatedUsers;
      if (existingUserIndex >= 0) {
        // 既存ユーザーを更新
        updatedUsers = currentUsers.map(u => u.id === userInfo.id ? userInfo : u);
      } else {
        // 新規ユーザーを追加
        updatedUsers = [...currentUsers, userInfo];
      }
      
      setUsers(updatedUsers);
      
      // ユーザーリストを保存
      const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
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
      role: userData.role || existingUser?.role || 'ユーザー',
      status: 'アクティブ',
      createdAt: existingUser?.createdAt || user.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: userData.isInvited || existingUser?.isInvited || false,
      inviteToken: userData.inviteToken || existingUser?.inviteToken || '',
      companyId: userData.companyId || existingUser?.companyId || ''
    };
    
    // ユーザー情報を保存
    setCurrentUser(updatedUserInfo);
    setIsAuthenticated(true);
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUserInfo));
      
      // ユーザーリストを更新
      const existingUserIndex = currentUsers.findIndex(u => u.id === updatedUserInfo.id);
      
      let updatedUsers;
      if (existingUserIndex >= 0) {
        // 既存ユーザーを更新
        updatedUsers = currentUsers.map(u => u.id === updatedUserInfo.id ? updatedUserInfo : u);
      } else {
        // 新規ユーザーを追加
        updatedUsers = [...currentUsers, updatedUserInfo];
      }
      
      setUsers(updatedUsers);
      
      // ユーザーリストを保存
      const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    }
    
    return true;
  } catch (error) {
    console.error('[Supabase] Update user error:', error);
    return false;
  }
};
