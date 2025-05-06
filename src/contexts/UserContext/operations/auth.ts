import { UserInfo, UserStatus } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { supabase } from '@/lib/supabaseClient';
import { isEqual } from '@/utils/deepEqual';
import { fetchAndCacheCompanyInfo } from '@/utils/companyInfo';

// Supabaseを使用したログイン処理
export const loginWithGoogle = async (
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  try {
    const client = supabase();
    
    // 現在のセッションを取得
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    if (sessionError) {
      console.error('[Supabase] Session error:', sessionError);
      return false;
    }
    
    if (!session) {
      console.log('[Supabase] No active session');
      return false;
    }
    
    // ユーザー情報を取得
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      console.error('[Supabase] User error:', userError);
      return false;
    }
    
    // app_usersテーブルからユーザー情報を取得
    let dbUserInfo = null;
    try {
      const { getUserFromDatabase } = await import('@/lib/supabaseClient');
      const result = await getUserFromDatabase(user.id);
      if (result.success && result.data) {
        console.log('[Supabase] User found in database:', result.data);
        dbUserInfo = result.data;
      } else {
        console.log('[Supabase] User not found in database or error:', result.error);
      }
    } catch (error) {
      console.error('[Supabase] Error importing getUserFromDatabase:', error);
    }
    
    // ローカルストレージからユーザーリストを取得
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, () => ({ users: [] }));
    
    // ユーザーIDで既存ユーザーを検索
    const existingUser = currentUsers.find(u => u.id === user.id);
    
    // Supabaseのユーザーメタデータから会社IDを取得（優先）
    const companyIdFromMetadata = user.user_metadata?.company_id;
    
    // データベースから会社IDを取得（次に優先）
    const companyIdFromDatabase = dbUserInfo?.company_id;
    
    // UserInfo形式に変換
    const userInfo: UserInfo = {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      email: user.email || '',
      fullName: user.user_metadata?.full_name || dbUserInfo?.full_name || '',
      role: user.user_metadata?.role || dbUserInfo?.role || existingUser?.role || '管理者', // メタデータから役割を取得
      status: 'アクティブ' as UserStatus,
      createdAt: existingUser?.createdAt || (dbUserInfo?.created_at as string) || (user.created_at as string) || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: false, // 招待フラグをリセット
      inviteToken: existingUser?.inviteToken || '',
      companyId: companyIdFromMetadata || companyIdFromDatabase || existingUser?.companyId || '' // メタデータから会社IDを優先取得、次にDBから
    };
    
    // ユーザー情報を保存
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    
    // app_usersテーブルにユーザー情報を保存
    try {
      const { saveUserToDatabase } = await import('@/lib/supabaseClient');
      const result = await saveUserToDatabase(user.id, userInfo);
      if (!result.success) {
        console.error('[Supabase] Failed to save user to database:', result.error);
      } else {
        console.log('[Supabase] User saved to database successfully');
      }
    } catch (error) {
      console.error('[Supabase] Error importing saveUserToDatabase:', error);
    }
    
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
          status: 'アクティブ' as UserStatus, // ステータスを更新
          companyId: userInfo.companyId, // 会社IDを更新
          isInvited: false // 招待フラグをリセット
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
    
    // 会社情報を取得してキャッシュ
    if (userInfo.companyId) {
      await fetchAndCacheCompanyInfo(userInfo.companyId);
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
    const client = supabase();
    
    // Supabaseからログアウト
    await client.auth.signOut();
    
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
    const client = supabase();
    
    // 現在のセッションを取得
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Supabase] Session error:', sessionError);
      return false;
    }
    
    // ユーザー情報を取得
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      console.error('[Supabase] User error:', userError);
      return false;
    }

    // 招待ユーザーの場合、会社IDが必須
    const isInvitedUser = userData.isInvited || userData.status === '招待中';
    if (isInvitedUser && (!userData.companyId || userData.companyId.trim() === '')) {
      console.error('[updateUserAfterGoogleSignIn] Company ID is required for invited users');
      return false;
    }

    console.log('[updateUserAfterGoogleSignIn] Processing user with data:', userData);
    
    // 既存のユーザー情報を取得
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, () => ({ users: [] }));
    
    // Supabaseのユーザーメタデータを更新
    try {
      const { error } = await client.auth.updateUser({
        data: {
          company_id: userData.companyId,
          role: userData.role || '一般ユーザー',
          status: 'アクティブ',
          isInvited: false
        }
      });
      
      if (error) {
        console.error('[updateUserAfterGoogleSignIn] Error updating user metadata:', error);
      } else {
        console.log('[updateUserAfterGoogleSignIn] User metadata updated successfully with company ID:', userData.companyId);
      }
    } catch (error) {
      console.error('[updateUserAfterGoogleSignIn] Error updating user metadata:', error);
    }
    
    // UserInfo形式に変換して更新
    const updatedUserInfo: UserInfo = {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      email: user.email || '',
      fullName: user.user_metadata?.full_name || '',
      role: userData.role || currentUsers.find(u => u.id === user.id)?.role || '一般ユーザー',
      status: 'アクティブ' as UserStatus, // 招待完了状態に設定
      createdAt: currentUsers.find(u => u.id === user.id)?.createdAt || (user.created_at as string) || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: false, // 招待フラグをリセット
      inviteToken: userData.inviteToken || currentUsers.find(u => u.id === user.id)?.inviteToken || '',
      companyId: userData.companyId || user.user_metadata?.company_id || currentUsers.find(u => u.id === user.id)?.companyId || ''
    };
    
    // app_usersテーブルにユーザー情報を保存
    try {
      const { saveUserToDatabase } = await import('@/lib/supabaseClient');
      const result = await saveUserToDatabase(user.id, updatedUserInfo);
      if (!result.success) {
        console.error('[updateUserAfterGoogleSignIn] Failed to save user to database:', result.error);
      } else {
        console.log('[updateUserAfterGoogleSignIn] User saved to database successfully');
      }
    } catch (error) {
      console.error('[updateUserAfterGoogleSignIn] Error importing saveUserToDatabase:', error);
    }
    
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
    }
    
    // ユーザーリストを更新
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === user.id);
      if (idx === -1) {
        // 新規ユーザーを追加
        const newUsers = [...prev, updatedUserInfo];
        
        // ローカルストレージに保存
        const usersToSave = newUsers.map(u => ({ user: u, password: '' }));
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        
        // セッションストレージにも保存
        try {
          sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        } catch (e) {
          console.error('[Supabase] Failed to save users to sessionStorage:', e);
        }
        
        return newUsers;
      }
      
      // 既存ユーザーを更新
      const next = [...prev];
      next[idx] = updatedUserInfo;
      
      // ローカルストレージに保存
      const usersToSave = next.map(u => ({ user: u, password: '' }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
      
      // セッションストレージにも保存
      try {
        sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
      } catch (e) {
        console.error('[Supabase] Failed to save users to sessionStorage:', e);
      }
      
      console.log('[updateUserAfterGoogleSignIn] User data updated and saved');
      return next;
    });
    
    return true;
  } catch (error) {
    console.error('[Supabase] Update user error:', error);
    return false;
  }
};
