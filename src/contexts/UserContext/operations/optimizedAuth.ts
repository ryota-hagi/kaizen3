/**
 * 認証関連の最適化された操作を提供するモジュール
 * 
 * このモジュールは以下の機能を提供します：
 * 1. Google認証でのログイン処理
 * 2. ログアウト処理
 * 3. セッションの検証
 * 4. ユーザー情報の更新
 */

import { Dispatch, SetStateAction } from 'react';
import { UserInfo, UserStatus } from '@/utils/api';
import { 
  supabase, 
  saveSessionToStorage, 
  saveUserToDatabase, 
  getUserFromDatabase,
  validateSession,
  clearAuthStorage
} from '@/lib/supabaseClient';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY, loadUserDataFromLocalStorage } from '../utils';
import { isEqual } from '@/utils/deepEqual';
import { fetchAndCacheCompanyInfo } from '@/utils/companyInfo';

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
 * ストレージ操作を抽象化したオブジェクト
 */
const storage = {
  // メモリキャッシュ
  _cache: new Map<string, string>(),
  
  // ユーザー情報をストレージから読み込む
  loadUserInfo: (): UserInfo | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      // まずメモリキャッシュから取得
      const cachedData = storage._cache.get(USER_STORAGE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // 次にlocalStorageから取得
      const userInfoStr = localStorage.getItem(USER_STORAGE_KEY);
      if (userInfoStr) {
        // キャッシュに保存
        storage._cache.set(USER_STORAGE_KEY, userInfoStr);
        return JSON.parse(userInfoStr);
      }
      
      // 最後にsessionStorageから取得
      const sessionData = sessionStorage.getItem(USER_STORAGE_KEY);
      if (sessionData) {
        // キャッシュに保存
        storage._cache.set(USER_STORAGE_KEY, sessionData);
        return JSON.parse(sessionData);
      }
    } catch (error) {
      log('[Storage] Failed to parse user from storage');
    }
    
    return null;
  },
  
  // ユーザー情報をストレージに保存
  saveUserInfo: (userInfo: UserInfo): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const userInfoStr = JSON.stringify(userInfo);
      
      // まずメモリキャッシュに保存
      storage._cache.set(USER_STORAGE_KEY, userInfoStr);
      
      // localStorageに保存
      localStorage.setItem(USER_STORAGE_KEY, userInfoStr);
      
      // sessionStorageにも保存
      try {
        sessionStorage.setItem(USER_STORAGE_KEY, userInfoStr);
      } catch (e) {
        // sessionStorageへの保存に失敗しても続行
      }
    } catch (error) {
      log('[Storage] Failed to save user to storage');
    }
  },
  
  // ユーザーリストをストレージに保存
  saveUsersList: (users: UserInfo[]): void => {
    if (typeof window === 'undefined') return;
    
    const usersToSave = users.map(u => ({ user: u, password: '' }));
    
    try {
      const usersStr = JSON.stringify(usersToSave);
      
      // まずメモリキャッシュに保存
      storage._cache.set(USERS_STORAGE_KEY, usersStr);
      
      // localStorageに保存
      localStorage.setItem(USERS_STORAGE_KEY, usersStr);
      
      // sessionStorageにも保存
      try {
        sessionStorage.setItem(USERS_STORAGE_KEY, usersStr);
      } catch (e) {
        // sessionStorageへの保存に失敗しても続行
      }
    } catch (error) {
      log('[Storage] Failed to save users list to storage');
    }
  },
  
  // アイテムを取得
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    // まずメモリキャッシュから取得
    if (storage._cache.has(key)) {
      return storage._cache.get(key) || null;
    }
    
    try {
      // 次にlocalStorageから取得
      const localValue = localStorage.getItem(key);
      if (localValue) {
        // キャッシュに保存
        storage._cache.set(key, localValue);
        return localValue;
      }
      
      // 最後にsessionStorageから取得
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) {
        // キャッシュに保存
        storage._cache.set(key, sessionValue);
        return sessionValue;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  },
  
  // アイテムを保存
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    
    // まずメモリキャッシュに保存
    storage._cache.set(key, value);
    
    try {
      // localStorageに保存
      localStorage.setItem(key, value);
      
      // sessionStorageにも保存
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        // sessionStorageへの保存に失敗しても続行
      }
    } catch (e) {
      // すべてのストレージ操作に失敗した場合はログ出力
      if (DEBUG) console.error('[Storage] Failed to save data:', e);
    }
  },
  
  // アイテムを削除
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    // メモリキャッシュから削除
    storage._cache.delete(key);
    
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      // エラーは無視
    }
  },
  
  // ユーザー関連のストレージをクリア
  clearUserStorage: (): void => {
    if (typeof window === 'undefined') return;
    
    clearAuthStorage(); // Supabase認証関連のストレージをクリア
    
    try {
      storage.removeItem(USER_STORAGE_KEY);
      storage.removeItem(USERS_STORAGE_KEY);
    } catch (error) {
      // エラーは無視
    }
  },
  
  // キャッシュをクリア
  clearCache: (): void => {
    storage._cache.clear();
  }
};

/**
 * 最適化されたGoogle認証ログイン処理
 * 
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setUsers ユーザーリストを更新する関数
 * @param setIsAuthenticated 認証状態を更新する関数
 * @returns 処理結果とユーザー情報
 */
export const loginWithGoogle = async (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>
): Promise<{ success: boolean; user?: UserInfo; error?: any }> => {
  try {
    const client = supabase();
    
    // 現在のセッションを取得
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    if (sessionError) {
      log('[Auth] Session error:', sessionError);
      return { success: false, error: sessionError };
    }
    
    if (!session) {
      log('[Auth] No session found');
      return { success: false, error: 'No session found' };
    }
    
    // セッション情報をストレージに保存（有効期限を延長）
    await saveSessionToStorage(session, true);
    log('[Auth] Session saved with extended expiry');
    
    // ユーザー情報を取得
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      log('[Auth] User error:', userError);
      return { success: false, error: userError || 'User not found' };
    }
    
    // app_usersテーブルからユーザー情報を取得
    const dbResult = await getUserFromDatabase(user.id);
    const dbUserInfo = dbResult.success ? dbResult.data : null;
    
    // ローカルストレージからユーザーリストを取得（キャッシュ利用）
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
      role: user.user_metadata?.role || dbUserInfo?.role || existingUser?.role || '管理者',
      status: 'アクティブ' as UserStatus,
      createdAt: existingUser?.createdAt || (dbUserInfo?.created_at as string) || (user.created_at as string) || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isInvited: false,
      inviteToken: existingUser?.inviteToken || '',
      companyId: companyIdFromMetadata || companyIdFromDatabase || existingUser?.companyId || ''
    };
    
    // ユーザー情報を保存
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    
    // app_usersテーブルにユーザー情報を保存（非同期で実行）
    saveUserToDatabase(user.id, userInfo)
      .then(result => {
        if (!result.success) {
          log('[Auth] Warning: Failed to save user to database:', result.error);
        } else {
          log('[Auth] User saved to database');
        }
      })
      .catch(error => {
        log('[Auth] Exception saving user to database:', error);
      });
    
    // ローカルストレージに保存
    storage.saveUserInfo(userInfo);
    
    // ユーザーリストを更新（メモリ内のみ）
    const existingUserIndex = currentUsers.findIndex(u => u.id === userInfo.id);
    
    let updatedUsers;
    if (existingUserIndex >= 0) {
      // 既存ユーザーを更新
      const updatedUser: UserInfo = {
        ...currentUsers[existingUserIndex],
        lastLogin: new Date().toISOString(),
        fullName: userInfo.fullName,
        email: userInfo.email,
        status: 'アクティブ' as UserStatus,
        companyId: userInfo.companyId,
        isInvited: false
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
    
    // 前回保存したデータと比較して変更がある場合のみ保存（非同期で実行）
    const usersToSave = updatedUsers.map(u => ({ user: u, password: '' }));
    
    // ローカルストレージから現在のデータを取得
    const currentSavedData = storage.getItem(USERS_STORAGE_KEY);
    const currentParsedData = currentSavedData ? JSON.parse(currentSavedData) : [];
    
    // 変更を検出
    if (!isEqual(currentParsedData, usersToSave)) {
      // 非同期で保存
      setTimeout(() => {
        storage.saveUsersList(updatedUsers);
        log('[Auth] Users list updated in storage');
      }, 0);
    } else {
      log('[Auth] No changes in users list, skipping storage update');
    }
    
    // 会社情報を取得してキャッシュ（非同期で実行）
    if (userInfo.companyId) {
      fetchAndCacheCompanyInfo(userInfo.companyId)
        .then(() => {
          log('[Auth] Company info cached for ID:', userInfo.companyId);
        })
        .catch(error => {
          log('[Auth] Warning: Failed to cache company info:', error);
        });
    }

    return { success: true, user: userInfo };
  } catch (error) {
    log('[Auth] Login error:', error);
    return { success: false, error };
  }
};

/**
 * 最適化されたログアウト処理
 * 
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setIsAuthenticated 認証状態を更新する関数
 * @param setCompanyId 会社IDを更新する関数
 * @returns 処理結果
 */
export const logout = async (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
): Promise<{ success: boolean; error?: any }> => {
  try {
    // まずローカルの状態をクリア（UI応答性向上のため）
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCompanyId('');
    
    // ストレージをクリア
    storage.clearUserStorage();
    log('[Auth] User storage cleared');
    
    // Supabaseからログアウト（非同期で実行）
    const client = supabase();
    client.auth.signOut()
      .then(({ error }) => {
        if (error) {
          log('[Auth] Error signing out from Supabase:', error);
        } else {
          log('[Auth] Signed out from Supabase');
        }
      })
      .catch(error => {
        log('[Auth] Exception signing out from Supabase:', error);
      });
    
    return { success: true };
  } catch (error) {
    log('[Auth] Logout error:', error);
    
    // エラーが発生しても、ローカルの状態とストレージはクリアする
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCompanyId('');
    storage.clearUserStorage();
    
    return { success: false, error };
  }
};

/**
 * セッションの検証
 * 
 * @returns 検証結果とユーザー情報
 */
export const validateUserSession = async (): Promise<{ valid: boolean; user?: any; error?: any }> => {
  try {
    // キャッシュを使用して高速化
    const cachedUserInfo = storage.loadUserInfo();
    if (cachedUserInfo) {
      // キャッシュからユーザー情報が取得できた場合は、セッションの検証のみ行う
      const { valid } = await validateSession();
      
      if (valid) {
        log('[Auth] Session validation successful (using cached user info)');
        return { valid: true, user: { id: cachedUserInfo.id, email: cachedUserInfo.email } };
      }
    }
    
    // キャッシュがない場合や無効な場合は、完全な検証を行う
    const { valid, session, error } = await validateSession();
    
    if (error) {
      log('[Auth] Session validation error:', error);
      return { valid: false, error };
    }
    
    if (!valid || !session) {
      log('[Auth] Session validation failed');
      return { valid: false, error: 'Session validation failed' };
    }
    
    log('[Auth] Session validation successful');
    return { valid: true, user: session.user };
  } catch (error) {
    log('[Auth] Session validation exception:', error);
    return { valid: false, error };
  }
};

/**
 * ユーザー情報の更新
 * 
 * @param userData 更新するユーザー情報
 * @param currentUser 現在のユーザー情報
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setUsers ユーザーリストを更新する関数
 * @returns 処理結果と更新されたユーザー情報
 */
export const updateUserInfo = async (
  userData: Partial<UserInfo>,
  currentUser: UserInfo | null,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>
): Promise<{ success: boolean; user?: UserInfo; error?: any }> => {
  try {
    if (!currentUser) {
      log('[Auth] No current user to update');
      return { success: false, error: 'No current user to update' };
    }
    
    // 更新されたユーザー情報
    const updatedUserInfo: UserInfo = {
      ...currentUser,
      ...userData,
      lastLogin: new Date().toISOString()
    };
    
    // まずUIを更新（応答性向上のため）
    setCurrentUser(updatedUserInfo);
    
    // ローカルストレージに保存
    storage.saveUserInfo(updatedUserInfo);
    
    // Supabaseのユーザーメタデータを更新（非同期で実行）
    const client = supabase();
    client.auth.updateUser({
      data: {
        ...userData,
        company_id: userData.companyId || currentUser.companyId
      }
    })
      .then(({ error }) => {
        if (error) {
          log('[Auth] Error updating user metadata:', error);
        } else {
          log('[Auth] User metadata updated in Supabase');
        }
      })
      .catch(error => {
        log('[Auth] Exception updating user metadata:', error);
      });
    
    // app_usersテーブルにユーザー情報を保存（非同期で実行）
    saveUserToDatabase(currentUser.id, updatedUserInfo)
      .then(result => {
        if (!result.success) {
          log('[Auth] Warning: Failed to update user in database:', result.error);
        } else {
          log('[Auth] User info updated in database');
        }
      })
      .catch(error => {
        log('[Auth] Exception updating user in database:', error);
      });
    
    // ユーザーリストを更新
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === currentUser.id);
      
      if (idx === -1) {
        // 新規ユーザーを追加
        const newUsers = [...prev, updatedUserInfo];
        
        // 非同期でローカルストレージに保存
        setTimeout(() => {
          storage.saveUsersList(newUsers);
        }, 0);
        
        return newUsers;
      }
      
      // 既存ユーザーを更新
      const next = [...prev];
      next[idx] = updatedUserInfo;
      
      // 非同期でローカルストレージに保存
      setTimeout(() => {
        storage.saveUsersList(next);
      }, 0);
      
      return next;
    });
    
    // 会社情報を更新（非同期で実行）
    if (userData.companyId && userData.companyId !== currentUser.companyId) {
      fetchAndCacheCompanyInfo(userData.companyId)
        .then(() => {
          log('[Auth] Company info cached for new ID:', userData.companyId);
        })
        .catch(error => {
          log('[Auth] Warning: Failed to cache company info:', error);
        });
    }
    
    return { success: true, user: updatedUserInfo };
  } catch (error) {
    log('[Auth] Update user error:', error);
    return { success: false, error };
  }
};

/**
 * ユーザー情報をストレージから取得
 * 
 * @returns ユーザー情報
 */
export const getUserInfoFromStorage = (): UserInfo | null => {
  return storage.loadUserInfo();
};
