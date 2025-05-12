/**
 * UserContextの初期化処理を行うモジュール
 * 
 * このモジュールは以下の機能を提供します：
 * 1. UserContextの初期化処理
 * 2. セッション管理
 * 3. ストレージとの連携
 */

import { Dispatch, SetStateAction } from 'react';
import { UserInfo } from '@/utils/api';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { 
  supabase, 
  validateSession, 
  clearAuthStorage,
  getUserFromDatabase,
  saveUserToDatabase
} from '../../../lib/supabaseClient';

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
 * 初期化処理を行う関数（最適化版）
 * 
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setUsers ユーザーリストを更新する関数
 * @param setIsAuthenticated 認証状態を更新する関数
 * @param setCompanyId 会社IDを更新する関数
 * @param setUserPasswords ユーザーパスワードを更新する関数
 * @param alreadyInitialised 初期化済みフラグ
 */
export const initializeProvider = async (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>,
  alreadyInitialised?: { current: boolean }
) => {
  if (typeof window === 'undefined') return;
  
  // 既に初期化済みの場合は最小限の処理のみ実行
  if (alreadyInitialised?.current) {
    await performMinimalSessionCheck(setIsAuthenticated, setCompanyId);
    return;
  }
  
  // 1. Supabaseセッションを確認
  const sessionResult = await checkSupabaseSession(setCurrentUser, setIsAuthenticated, setCompanyId);
  if (!sessionResult.valid) return; // セッションがない場合は早期リターン
  
  const { sessionUser, sessionCompanyId } = sessionResult;

  // 2. ストレージからユーザー情報を読み込む
  const savedUserInfo = storage.loadUserInfo();
  
  // 3. ユーザーリストの読み込み
  const { users, passwords } = storage.loadUsersList();
  setUsers(users);
  setUserPasswords(passwords);

  // 4. currentUser を確定
  if (savedUserInfo) {
    await handleExistingUserInfo(
      savedUserInfo,
      sessionUser,
      sessionCompanyId,
      users,
      setCurrentUser,
      setIsAuthenticated,
      setCompanyId,
      setUsers
    );
  } else if (sessionUser) {
    // ストレージにcurrentUserはないが、Supabaseセッションがある場合
    await createUserFromSession(
      sessionUser,
      users,
      setCurrentUser,
      setIsAuthenticated,
      setCompanyId,
      setUsers
    );
  } else {
    setCurrentUser(null);
    setIsAuthenticated(false);
  }
  
  // 初期化完了
  if (alreadyInitialised) {
    alreadyInitialised.current = true;
  }
};

/**
 * 最小限のセッションチェックを実行する関数
 */
async function performMinimalSessionCheck(
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) {
  try {
    const client = supabase();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      return;
    }
    
    if (session) {
      // 認証状態を確認
      setIsAuthenticated(true);
      
      // セッションから会社IDを設定
      if (session.user?.user_metadata?.company_id) {
        setCompanyId(session.user.user_metadata.company_id);
      }
    }
  } catch (error) {
    // エラーは無視
  }
}

/**
 * Supabaseセッションを確認する関数
 */
async function checkSupabaseSession(
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
): Promise<{ valid: boolean; sessionUser: any; sessionCompanyId: string }> {
  try {
    // セッション検証を使用
    const { valid, session, error } = await validateSession();
    
    if (error) {
      handleInvalidSession(setCurrentUser, setIsAuthenticated, setCompanyId);
      return { valid: false, sessionUser: null, sessionCompanyId: '' };
    }
    
    if (valid && session) {
      const sessionUser = session.user;
      const sessionCompanyId = session.user?.user_metadata?.company_id ?? '';
      
      // 状態更新
      setCompanyId(sessionCompanyId);
      setIsAuthenticated(true);
      
      return { valid: true, sessionUser, sessionCompanyId };
    } else {
      handleInvalidSession(setCurrentUser, setIsAuthenticated, setCompanyId);
      return { valid: false, sessionUser: null, sessionCompanyId: '' };
    }
  } catch (error) {
    handleInvalidSession(setCurrentUser, setIsAuthenticated, setCompanyId);
    return { valid: false, sessionUser: null, sessionCompanyId: '' };
  }
}

/**
 * 無効なセッションを処理する関数
 */
function handleInvalidSession(
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) {
  // セッションがない場合はストレージをクリア
  storage.clearUserStorage();
  
  // 状態更新
  setCurrentUser(null);
  setIsAuthenticated(false);
  setCompanyId('');
}

/**
 * 既存のユーザー情報を処理する関数
 */
async function handleExistingUserInfo(
  savedUserInfo: UserInfo,
  sessionUser: any,
  sessionCompanyId: string,
  loadedUsers: UserInfo[],
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>
) {
  // 保存されていたユーザーがリストに存在するか、またはSupabaseセッションと一致するか確認
  const userExistsInList = loadedUsers.some(u => u.id === savedUserInfo.id);
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
    
    // 最終ログイン日時を更新
    savedUserInfo.lastLogin = new Date().toISOString();
    
    // 状態を更新
    setCurrentUser(savedUserInfo);
    setIsAuthenticated(true);
    setCompanyId(savedUserInfo.companyId || sessionCompanyId);
    
    // ストレージに保存
    storage.saveUserInfo(savedUserInfo);

    // リストに存在しないがセッションとは一致する場合、リストに追加する
    if (!userExistsInList && sessionMatchesSaved) {
      const updatedUsers = [...loadedUsers, savedUserInfo];
      setUsers(updatedUsers);
      storage.saveUsersList(updatedUsers);
    }
    
    // データベースにも保存
    if (sessionUser) {
      saveUserToDatabase(sessionUser.id, savedUserInfo).catch(() => {});
    }
  } else {
    // ユーザー情報が一致しない場合はストレージをクリア
    storage.clearUserStorage();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCompanyId('');
  }
}

/**
 * セッションからユーザー情報を作成する関数
 */
async function createUserFromSession(
  sessionUser: any,
  loadedUsers: UserInfo[],
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>
) {
  setIsAuthenticated(true);
  
  // セッションからユーザー情報を取得して設定
  try {
    const client = supabase();
    
    // まずデータベースからユーザー情報を取得
    const dbResult = await getUserFromDatabase(sessionUser.id);
    const dbUserInfo = dbResult.success ? dbResult.data : null;
    
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      return;
    }
    
    if (user) {
      // 既存ユーザーを検索
      const existingUser = loadedUsers.find(u => u.id === user.id);
      
      const userInfo: UserInfo = {
        id: user.id,
        username: user.email?.split('@')[0] || '',
        email: user.email || '',
        fullName: user.user_metadata?.full_name || (dbUserInfo?.full_name as string) || existingUser?.fullName || '',
        role: user.user_metadata?.role || (dbUserInfo?.role as string) || existingUser?.role || '一般ユーザー',
        status: 'アクティブ',
        createdAt: existingUser?.createdAt || (dbUserInfo?.created_at as string) || user.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isInvited: false,
        inviteToken: existingUser?.inviteToken || '',
        companyId: user.user_metadata?.company_id || (dbUserInfo?.company_id as string) || existingUser?.companyId || ''
      };
      
      // 状態を更新
      setCurrentUser(userInfo);
      setCompanyId(userInfo.companyId);
      
      // ストレージに保存
      storage.saveUserInfo(userInfo);
      
      // ユーザーリストに追加
      if (!existingUser) {
        const updatedUsers = [...loadedUsers, userInfo];
        setUsers(updatedUsers);
        storage.saveUsersList(updatedUsers);
      }
      
      // データベースにも保存
      saveUserToDatabase(user.id, userInfo).catch(() => {});
    }
  } catch (error) {
    // エラーは無視
  }
}

/**
 * セッションが切れた場合の自動ログアウト処理
 * 
 * @param setCurrentUser ユーザー情報を更新する関数
 * @param setIsAuthenticated 認証状態を更新する関数
 * @param setCompanyId 会社IDを更新する関数
 */
export const handleSessionExpired = (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) => {
  storage.clearUserStorage();
  setCurrentUser(null);
  setIsAuthenticated(false);
  setCompanyId('');
};
