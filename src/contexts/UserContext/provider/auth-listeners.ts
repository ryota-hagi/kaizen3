import { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { UserInfo } from '@/utils/api';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { loginWithGoogle } from '../operations';

/**
 * Supabaseの認証状態変更を監視するリスナーを設定
 */
export const setupAuthStateListener = (
  currentUser: UserInfo | null,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>
) => {
  const supabase = getSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[Provider] Auth state changed:', event, session?.user?.email);
      if (event === 'SIGNED_IN') {
        console.log('[Provider] User SIGNED_IN, attempting to update user info...');
        // loginWithGoogle内でユーザー情報取得・設定・保存を行う
        await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
        // セッションから会社IDを再取得・設定
        const cid = session?.user?.user_metadata?.company_id ?? '';
        setCompanyId(cid);
        console.log('[Provider] Company ID updated from SIGNED_IN event:', cid);
      } else if (event === 'SIGNED_OUT') {
        console.log('[Provider] User SIGNED_OUT, clearing state.');
        setCurrentUser(null);
        setIsAuthenticated(false);
        setCompanyId(''); // 会社IDもクリア
        // ストレージクリアは logout 関数内で行う想定
      } else if (event === 'USER_UPDATED') {
        console.log('[Provider] User data UPDATED in Supabase.');
        // 必要に応じて currentUser や users リストを更新
        if (session?.user && currentUser && session.user.id === currentUser.id) {
          const metaCompanyId = session.user.user_metadata?.company_id ?? '';
          if (metaCompanyId !== currentUser.companyId) {
            console.log('[Provider] Updating companyId based on USER_UPDATED event.');
            const updatedCurrentUser = { ...currentUser, companyId: metaCompanyId };
            setCurrentUser(updatedCurrentUser);
            setCompanyId(metaCompanyId);
            // ストレージにも反映
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrentUser));
            try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedCurrentUser)); } catch(e){}
          }
        }
      }
    }
  );

  return subscription;
};

/**
 * 初回のみ実行するAuth監視リスナーを設定
 */
export const setupInitialAuthListener = (
  alreadyInitialised: MutableRefObject<boolean>,
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>,
  setCompanyId: Dispatch<SetStateAction<string>>,
  currentUser: UserInfo | null
) => {
  const supabase = getSupabaseClient();
  console.log('[Provider] Setting up onAuthStateChange listener');
  
  const { data: authSubscription } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Provider] onAuthStateChange event:', event);
    
    if (alreadyInitialised.current && (event === 'INITIAL_SESSION')) {
      console.log('[Provider] Already initialized and event is INITIAL_SESSION, skipping.');
      return; // INITIAL_SESSION は初回以降無視
    }

    // SIGNED_IN または 初回のINITIAL_SESSION のみ処理
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && !alreadyInitialised.current)) {
      if (alreadyInitialised.current) {
        console.log('[Provider] Already initialized but received SIGNED_IN, processing...');
        // SIGNED_INの場合は再処理が必要な場合があるためフラグをリセットしない
      } else {
        console.log('[Provider] Initializing based on event:', event);
        alreadyInitialised.current = true; // ここでフラグを立てる
      }

      console.log('[Provider] Loading user data due to auth event:', event);
      // loginWithGoogle内でユーザー情報取得・設定・保存を行う
      await loginWithGoogle(setCurrentUser, setUsers, setIsAuthenticated);
    } else if (event === 'SIGNED_OUT') {
      console.log('[Provider] User SIGNED_OUT, clearing state.');
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCompanyId('');
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
    }
  });

  return authSubscription;
};
