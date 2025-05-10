import { Dispatch, SetStateAction } from 'react';
import { UserInfo } from '@/utils/api';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { supabase } from '@/lib/supabaseClient';
import { loginWithGoogle } from '../operations/auth';
import { handleSessionExpired } from './initialization';

// 認証状態変更リスナーを設定する関数
export const setupAuthStateChangeListener = (
  currentUser: UserInfo | null,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  alreadyInitialised: { current: boolean }
) => {
  const client = supabase();
  console.log('[Provider] Setting up onAuthStateChange listener');
  
  const { data: authSubscription } = client.auth.onAuthStateChange(async (event, session) => {
    console.log('[Provider] onAuthStateChange event:', event);
    
    // INITIAL_SESSIONイベントの処理を改善
    if (event === 'INITIAL_SESSION') {
      // セッションがある場合は常に処理する（alreadyInitialisedフラグに関わらず）
      if (session) {
        console.log('[Provider] Processing INITIAL_SESSION with valid session');
        await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
        
        // セッションから会社IDを設定
        if (session.user?.user_metadata?.company_id) {
          const cid = session.user.user_metadata.company_id;
          setCompanyId(cid);
          console.log('[Provider] Company ID updated from auth event:', cid);
        }
        
        // 初期化済みフラグを設定
        alreadyInitialised.current = true;
      }
      return;
    }

    // SIGNED_INイベントの処理
    if (event === 'SIGNED_IN') {
      console.log('[Provider] Processing SIGNED_IN event');
      
      // loginWithGoogle内でユーザー情報取得・設定・保存を行う
      await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
      
      // セッションから会社IDを設定
      if (session?.user?.user_metadata?.company_id) {
        const cid = session.user.user_metadata.company_id;
        setCompanyId(cid);
        console.log('[Provider] Company ID updated from auth event:', cid);
      }
      
      // 初期化済みフラグを設定
      alreadyInitialised.current = true;
    } else if (event === 'SIGNED_OUT') {
      console.log('[Provider] User SIGNED_OUT, clearing state.');
      handleSessionExpired(setCurrentUser, setIsAuthenticated, setCompanyId);
      alreadyInitialised.current = false; // ログアウトしたら初期化フラグをリセット
    } else if (event === 'USER_UPDATED') {
      console.log('[Provider] User data UPDATED in Supabase.');
      if (session?.user && currentUser && session.user.id === currentUser.id) {
        const metaCompanyId = session.user.user_metadata?.company_id ?? '';
        if (metaCompanyId !== currentUser.companyId) {
          console.log('[Provider] Updating companyId based on USER_UPDATED event.');
          const updatedCurrentUser = { ...currentUser, companyId: metaCompanyId };
          setCurrentUser(updatedCurrentUser);
          setCompanyId(metaCompanyId);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrentUser));
          try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrentUser)); } catch(e){}
        }
      }
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('[Provider] Token refreshed, updating session.');
      // トークンが更新された場合、セッションを更新
      if (session) {
        // 必要に応じてセッション情報を更新
        console.log('[Provider] Session updated after token refresh.');
      } else {
        console.warn('[Provider] Token refreshed but no session found.');
        // セッションがない場合はログアウト処理
        handleSessionExpired(setCurrentUser, setIsAuthenticated, setCompanyId);
      }
    } else if (event === 'PASSWORD_RECOVERY') {
      console.log('[Provider] Password recovery event received.');
      // パスワードリカバリーイベントの処理（必要に応じて）
    }
  });

  return authSubscription.subscription;
};

// セッションの有効性を定期的にチェックする関数
export const setupSessionCheck = (
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) => {
  // 5分ごとにセッションをチェック
  const intervalId = setInterval(async () => {
    try {
      const client = supabase();
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        console.error('[SessionCheck] Error checking session:', error);
        return;
      }
      
      if (!session) {
        console.log('[SessionCheck] No active session found, logging out.');
        handleSessionExpired(setCurrentUser, setIsAuthenticated, setCompanyId);
      }
    } catch (error) {
      console.error('[SessionCheck] Exception checking session:', error);
    }
  }, 5 * 60 * 1000); // 5分ごと
  
  return intervalId;
};
