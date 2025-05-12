/**
 * 認証状態変更リスナーとセッションチェックの設定を行うモジュール
 * 
 * このモジュールは以下の機能を提供します：
 * 1. 認証状態変更リスナーの設定と管理
 * 2. セッションの有効性を定期的にチェックする機能
 */

import { Dispatch, SetStateAction } from 'react';
import { UserInfo } from '@/utils/api';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { 
  supabase, 
  getUserFromDatabase,
  saveUserToDatabase
} from '../../../lib/supabaseClient';

// 必要な関数を直接実装
const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  
  // Supabase認証関連のストレージをクリア
  const AUTH_TOKEN_KEY = 'sb-czuedairowlwfgbjmfbg-auth-token';
  const AUTH_DATA_KEY = 'sb-czuedairowlwfgbjmfbg-auth-data';
  const SESSION_CACHE_KEY = 'sb-session-cache';
  
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_DATA_KEY);
    localStorage.removeItem(SESSION_CACHE_KEY);
    
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_DATA_KEY);
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch (error) {
    // エラーは無視
  }
};

// セッション情報をストレージに保存する関数
const saveSessionToStorage = async (session: any, extendExpiry = false) => {
  if (!session) return;
  
  try {
    // 現在のUNIXタイムスタンプ（秒）
    const now = Math.floor(Date.now() / 1000);
    
    // 有効期限を計算
    const expiresAt = extendExpiry 
      ? now + 24 * 60 * 60 // 24時間
      : session.expires_at;
    
    const expiresIn = extendExpiry 
      ? 24 * 60 * 60 
      : session.expires_in || 3600;
    
    // トークンデータを保存
    const tokenData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: expiresAt,
      expires_in: expiresIn,
      token_type: session.token_type || 'bearer',
      provider_token: session.provider_token,
      provider_refresh_token: session.provider_refresh_token
    };
    
    // ストレージに保存
    const AUTH_TOKEN_KEY = 'sb-czuedairowlwfgbjmfbg-auth-token';
    const AUTH_DATA_KEY = 'sb-czuedairowlwfgbjmfbg-auth-data';
    const SESSION_CACHE_KEY = 'sb-session-cache';
    
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokenData));
    
    // セッション情報全体も保存
    const sessionData = {
      session: {
        ...session,
        expires_at: expiresAt,
        expires_in: expiresIn
      },
      user: session.user,
      timestamp: now // 保存時刻を記録
    };
    localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(sessionData));
    
    // セッションキャッシュも更新
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: true,
      timestamp: now,
      expiresAt
    }));
    
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokenData));
      sessionStorage.setItem(AUTH_DATA_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: true,
        timestamp: now,
        expiresAt
      }));
    } catch (e) {
      // sessionStorageへの保存に失敗しても続行
    }
  } catch (error) {
    console.error('[Auth] Error saving session data:', error);
  }
};

// セッションを更新する関数
const refreshSession = async () => {
  try {
    const client = supabase();
    
    // 現在のセッションを取得
    const { data: { session: currentSession } } = await client.auth.getSession();
    
    // 現在のセッションがない場合は更新できない
    if (!currentSession) {
      // セッションキャッシュを無効化
      const SESSION_CACHE_KEY = 'sb-session-cache';
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: false,
        timestamp: Math.floor(Date.now() / 1000)
      }));
      
      return { success: false, error: 'No current session' };
    }
    
    // セッションを更新
    const { data, error } = await client.auth.refreshSession();
    
    if (error) {
      return { success: false, error };
    }
    
    if (data.session) {
      // セッション情報をストレージに保存
      await saveSessionToStorage(data.session, true);
      
      return { success: true, session: data.session };
    }
    
    return { success: false };
  } catch (error) {
    return { success: false, error };
  }
};

// セッションの有効期限を延長する関数
const extendSessionExpiry = async () => {
  try {
    const client = supabase();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error || !session) {
      return { success: false, error };
    }
    
    // セッション情報をストレージに保存（有効期限を延長）
    await saveSessionToStorage(session, true);
    
    return { success: true, session };
  } catch (error) {
    return { success: false, error };
  }
};

// デバッグモードを無効化（ログ出力を完全に抑制）
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
  _cache: new Map<string, any>(),
  // ユーザー情報をストレージから読み込む
  loadUserInfo: (): UserInfo | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const userInfoStr = localStorage.getItem(USER_STORAGE_KEY);
      if (userInfoStr) {
        return JSON.parse(userInfoStr);
      }
      
      const sessionUserInfoStr = sessionStorage.getItem(USER_STORAGE_KEY);
      if (sessionUserInfoStr) {
        return JSON.parse(sessionUserInfoStr);
      }
    } catch (error) {
      log('[Storage] Failed to parse user from storage');
    }
    
    return null;
  },
  
  // ユーザーリストをストレージから読み込む
  loadUsersList: (): { users: UserInfo[], passwords: Record<string, string> } => {
    if (typeof window === 'undefined') return { users: [], passwords: {} };
    
    let users: UserInfo[] = [];
    let passwords: Record<string, string> = {};
    
    try {
      const storedUsersStr = localStorage.getItem(USERS_STORAGE_KEY);
      if (storedUsersStr) {
        const parsedData = JSON.parse(storedUsersStr) as { user: UserInfo, password?: string }[];
        // nullチェックを追加
        users = parsedData.map(item => item.user).filter(user => user != null);
        
        // パスワード情報も復元
        passwords = parsedData.reduce((acc, item) => {
          if (item.user && item.user.id && item.password) {
            acc[item.user.id] = item.password;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    } catch (error) {
      log('[Storage] Failed to parse users from localStorage');
    }
    
    return { users, passwords };
  },
  
  // ユーザー情報をストレージに保存
  saveUserInfo: (userInfo: UserInfo): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const userInfoStr = JSON.stringify(userInfo);
      localStorage.setItem(USER_STORAGE_KEY, userInfoStr);
      
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
    
    const usersToSave = users.map(u => ({ user: u }));
    
    try {
      const usersStr = JSON.stringify(usersToSave);
      localStorage.setItem(USERS_STORAGE_KEY, usersStr);
      
      try {
        sessionStorage.setItem(USERS_STORAGE_KEY, usersStr);
      } catch (e) {
        // sessionStorageへの保存に失敗しても続行
      }
    } catch (error) {
      // エラーは無視
    }
  },
  
  // ユーザー情報をストレージから削除
  removeUserInfo: (): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      // エラーは無視
    }
  },
  
  // ユーザー関連のストレージをクリア
  clearUserStorage: (): void => {
    if (typeof window === 'undefined') return;
    
    clearAuthStorage(); // Supabase認証関連のストレージをクリア
    
    try {
      // メモリキャッシュをクリア
      storage._cache.delete(USER_STORAGE_KEY);
      storage._cache.delete(USERS_STORAGE_KEY);
      
      // ストレージをクリア
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      
      localStorage.removeItem(USERS_STORAGE_KEY);
      sessionStorage.removeItem(USERS_STORAGE_KEY);
    } catch (error) {
      // エラーは無視
    }
  }
};

/**
 * 認証状態変更リスナーを設定する関数
 * 
 * @param currentUser 現在のユーザー情報
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setUsers ユーザーリストを更新する関数
 * @param setIsAuthenticated 認証状態を更新する関数
 * @param setCompanyId 会社IDを更新する関数
 * @param alreadyInitialised 初期化済みフラグ
 * @returns 認証状態変更リスナーの購読オブジェクト
 */
export const setupAuthStateChangeListener = (
  currentUser: UserInfo | null,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  alreadyInitialised: { current: boolean }
) => {
  const client = supabase();
  
  // 認証状態変更リスナーを設定
  const { data: authSubscription } = client.auth.onAuthStateChange(async (event, session) => {
    log(`[Provider] onAuthStateChange event: ${event}`);
    
    // イベント処理を簡素化
    switch (event) {
      case 'INITIAL_SESSION':
        await handleInitialSession(
          session, 
          currentUser, 
          setCurrentUser, 
          setIsAuthenticated, 
          setCompanyId, 
          alreadyInitialised
        );
        break;
        
      case 'SIGNED_IN':
        await handleSignedIn(session, setCompanyId);
        break;
        
      case 'SIGNED_OUT':
        handleSignedOut(setCurrentUser, setIsAuthenticated, setCompanyId, alreadyInitialised);
        break;
        
      case 'TOKEN_REFRESHED':
        await handleTokenRefreshed(session, setCurrentUser, setIsAuthenticated, setCompanyId);
        break;
        
      case 'USER_UPDATED':
        handleUserUpdated(session, currentUser, setCurrentUser, setCompanyId);
        break;
    }
  });

  return authSubscription.subscription;
};

/**
 * INITIAL_SESSIONイベントを処理する関数
 */
async function handleInitialSession(
  session: any,
  currentUser: UserInfo | null,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  alreadyInitialised: { current: boolean }
) {
  log('[Provider] Processing INITIAL_SESSION event');
  
  if (!session) return;
  
  // セッション情報を保存
  await saveSessionToStorage(session);
  log('[Provider] Session data explicitly saved to storage');
  setIsAuthenticated(true);
  
  // 会社IDを設定
  if (session.user?.user_metadata?.company_id) {
    setCompanyId(session.user.user_metadata.company_id);
  }
  
  // 既に初期化済みの場合は最小限の処理
  if (alreadyInitialised.current) {
    log('[Provider] Already initialized, performing minimal session refresh');
    if (currentUser) {
      log('[Provider] Current user exists, keeping current state');
    } else {
      // セッションからユーザー情報を復元
      await restoreUserFromSession(session, setCurrentUser);
    }
  } else {
    // 完全な初期化を実行
    log('[Provider] Full initialization with INITIAL_SESSION');
    await initializeUserFromSession(
      session, 
      setCurrentUser, 
      setIsAuthenticated, 
      setCompanyId, 
      alreadyInitialised
    );
  }
}

/**
 * セッションからユーザー情報を復元する関数
 */
async function restoreUserFromSession(
  session: any,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>
) {
  try {
    const client = supabase();
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
      storage.saveUserInfo(userInfo);
    }
  } catch (error) {
    log('[Auth] Error restoring user from session:', error);
  }
}

/**
 * セッションからユーザー情報を初期化する関数
 */
async function initializeUserFromSession(
  session: any,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  alreadyInitialised: { current: boolean }
) {
  try {
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    
    if (user) {
      // データベースからユーザー情報を取得
      const dbResult = await getUserFromDatabase(user.id);
      const dbUser = dbResult.success ? dbResult.data : null;
      
      const userInfo: UserInfo = {
        id: user.id,
        username: user.email?.split('@')[0] || '',
        email: user.email || '',
        fullName: user.user_metadata?.full_name || dbUser?.full_name || '',
        role: user.user_metadata?.role || dbUser?.role || '一般ユーザー',
        status: 'アクティブ',
        createdAt: user.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isInvited: false,
        inviteToken: '',
        companyId: user.user_metadata?.company_id || (dbUser?.company_id as string) || ''
      };
      
      setCurrentUser(userInfo);
      setIsAuthenticated(true);
      setCompanyId(userInfo.companyId);
      storage.saveUserInfo(userInfo);
      
      // データベースにユーザー情報を保存/更新
      await saveUserToDatabase(user.id, userInfo);
      
      log(`[Provider] Successfully initialized user from session: ${userInfo.email}`);
      alreadyInitialised.current = true;
    }
  } catch (error) {
    log('[Auth] Error initializing user from session:', error);
  }
}

/**
 * SIGNED_INイベントを処理する関数
 */
async function handleSignedIn(
  session: any,
  setCompanyId: Dispatch<SetStateAction<string>>
) {
  log('[Provider] Processing SIGNED_IN event');
  
  if (!session) return;
  
  // セッション情報を保存
  await saveSessionToStorage(session);
  log('[Provider] Session data explicitly saved to storage');
  
  // 会社IDを設定
  if (session.user?.user_metadata?.company_id) {
    log('[Provider] Company ID updated from auth event:', session.user.user_metadata.company_id);
    setCompanyId(session.user.user_metadata.company_id);
  }
}

/**
 * SIGNED_OUTイベントを処理する関数
 */
function handleSignedOut(
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  alreadyInitialised: { current: boolean }
) {
  log('[Provider] Processing SIGNED_OUT event');
  
  // ストレージをクリア
  clearAuthStorage();
  storage.clearUserStorage();
  
  // 状態をクリア
  setCurrentUser(null);
  setIsAuthenticated(false);
  setCompanyId('');
  alreadyInitialised.current = false;
}

/**
 * TOKEN_REFRESHEDイベントを処理する関数
 */
async function handleTokenRefreshed(
  session: any,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) {
  log('[Provider] Token refreshed, updating session.');
  
  if (session) {
    await saveSessionToStorage(session);
    log('[Provider] Session updated after token refresh.');
  } else {
    // セッションがない場合はログアウト処理
    clearAuthStorage();
    storage.clearUserStorage();
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCompanyId('');
  }
}

/**
 * USER_UPDATEDイベントを処理する関数
 */
function handleUserUpdated(
  session: any,
  currentUser: UserInfo | null,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) {
  if (session?.user && currentUser && session.user.id === currentUser.id) {
    const metaCompanyId = session.user.user_metadata?.company_id ?? '';
    if (metaCompanyId !== currentUser.companyId) {
      const updatedCurrentUser = { ...currentUser, companyId: metaCompanyId };
      setCurrentUser(updatedCurrentUser);
      setCompanyId(metaCompanyId);
      storage.saveUserInfo(updatedCurrentUser);
    }
  }
}

/**
 * セッションの有効性を定期的にチェックする関数
 * 
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setIsAuthenticated 認証状態を更新する関数
 * @param setCompanyId 会社IDを更新する関数
 * @returns クリーンアップ関数
 */
export const setupSessionCheck = (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) => {
  // セッションチェック関数
  const checkSession = async () => {
    try {
      const client = supabase();
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        log('[SessionCheck] Error checking session:', error);
        return;
      }
      
      if (!session) {
        // セッションがない場合はログアウト処理
        log('[SessionCheck] No session found, logging out');
        clearAuthStorage();
        storage.clearUserStorage();
        
        setCurrentUser(null);
        setIsAuthenticated(false);
        setCompanyId('');
        return;
      }
      
      // セッションの有効期限を確認
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      
      // 有効期限が60分以内の場合は更新（余裕を持たせる）
      if (expiresAt && expiresAt < now + 60 * 60) {
        log('[SessionCheck] Session expiring soon, refreshing');
        const result = await refreshSession();
        
        if (!result.success) {
          log('[SessionCheck] Failed to refresh session');
        } else {
          log('[SessionCheck] Session refreshed successfully');
          log('[SessionCheck] Session data explicitly saved to storage with extended expiry');
        }
      } else {
        // セッションが有効な場合でも、定期的にストレージに保存して有効期限を延長
        log('[SessionCheck] Session valid, updating storage with extended expiry');
        await extendSessionExpiry();
        log('[SessionCheck] Session data explicitly saved to storage with extended expiry');
      }
    } catch (error) {
      log('[SessionCheck] Exception checking session:', error);
    }
  };

  // 初回実行
  checkSession();
  
  // 15分ごとにセッションをチェック（頻度を下げて最適化）
  const intervalId = setInterval(checkSession, 15 * 60 * 1000);
  
  // ページの可視性変更時にもセッションをチェック
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkSession();
    }
  };
  
  // ページの可視性変更イベントリスナーを追加
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  
  // クリーンアップ関数を返す
  return () => {
    clearInterval(intervalId);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
};
