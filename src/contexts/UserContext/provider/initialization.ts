import { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { UserInfo } from '@/utils/api';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';

/**
 * プロバイダーの初期化処理
 * ローカルストレージとセッションストレージからデータを読み込み、Supabaseセッションを確認する
 */
export const initializeProvider = async (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  lastSavedUsers: MutableRefObject<UserInfo[]>,
  userPasswords: Record<string, string>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>
) => {
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

/**
 * currentUser と companyInfo の不整合をチェックする
 */
export const checkCompanyInfoConsistency = (currentUser: UserInfo | null) => {
  if (currentUser && currentUser.companyId && typeof window !== 'undefined') {
    try {
      const storedCompanyInfoStr = localStorage.getItem('kaizen_company_info'); // 実際のキーを使用
      if (storedCompanyInfoStr) {
        const storedCompanyInfo = JSON.parse(storedCompanyInfoStr);
        if (storedCompanyInfo && storedCompanyInfo.id !== currentUser.companyId) {
          console.warn('[Provider] Company info mismatch detected! Clearing stored company info and refetching.');
          localStorage.removeItem('kaizen_company_info'); // 不正な情報を削除

          // 正しい会社情報をフェッチして保存するロジック (必要に応じて実装)
          // この例では削除のみ
          // fetchCompany(currentUser.companyId).then(...)
        }
      }
    } catch (error) {
      console.error('[Provider] Error checking company info consistency:', error);
    }
  }
};
