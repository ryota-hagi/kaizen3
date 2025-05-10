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
  console.log('[Provider] Setting up auth state change listener');
  
  // セッション情報をストレージに明示的に保存する関数
  const saveSessionToStorage = (session: any) => {
    if (!session) return;
    
    try {
      // トークンデータを保存
      const tokenData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in || 3600,
        token_type: session.token_type || 'bearer',
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token
      };
      
      // ローカルストレージとセッションストレージの両方に保存
      localStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-token', JSON.stringify(tokenData));
      try { sessionStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-token', JSON.stringify(tokenData)); } catch(e){}
      
      // セッション情報全体も保存
      const sessionData = {
        session: session,
        user: session.user
      };
      localStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-data', JSON.stringify(sessionData));
      try { sessionStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-data', JSON.stringify(sessionData)); } catch(e){}
      
      console.log('[Provider] Session data explicitly saved to storage');
    } catch (storageError) {
      console.error('[Provider] Error saving session data to storage:', storageError);
    }
  };
  
  // 認証状態変更リスナーを設定
  const { data: authSubscription } = client.auth.onAuthStateChange(async (event, session) => {
    console.log('[Provider] onAuthStateChange event:', event);
    
    // INITIAL_SESSIONイベントの処理を改善
    if (event === 'INITIAL_SESSION') {
      console.log('[Provider] Processing INITIAL_SESSION event');
      
      // セッションがある場合は認証状態を設定
      if (session) {
        console.log('[Provider] INITIAL_SESSION with valid session');
        
        // セッション情報をストレージに明示的に保存
        saveSessionToStorage(session);
        
        // 認証状態を設定
        setIsAuthenticated(true);
        
        // セッションから会社IDを設定
        if (session.user?.user_metadata?.company_id) {
          const cid = session.user.user_metadata.company_id;
          setCompanyId(cid);
          console.log('[Provider] Company ID updated from auth event:', cid);
        }
        
        // 既に初期化済みの場合は部分的な処理のみ行う
        if (alreadyInitialised.current) {
          console.log('[Provider] Already initialized, performing minimal session refresh');
          
          // 現在のユーザー情報をチェック
          if (!currentUser) {
            console.log('[Provider] No current user but session exists, restoring user info');
            
            try {
              // セッションからユーザー情報を復元
              const { data: { user } } = await client.auth.getUser();
              
              if (user) {
                // ユーザー情報を構築
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
                
                // ユーザー情報を設定
                setCurrentUser(userInfo);
                setIsAuthenticated(true);
                
                // ストレージに保存
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
                try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo)); } catch(e){}
                
                console.log('[Provider] Successfully restored user from session:', userInfo.email);
              }
            } catch (error) {
              console.error('[Provider] Error restoring user from session:', error);
            }
          } else {
            console.log('[Provider] Current user exists, keeping current state');
          }
          
          return;
        }
        
        // 初期化されていない場合は完全な初期化を行う
        console.log('[Provider] Full initialization with INITIAL_SESSION');
        
        try {
          // セッションからユーザー情報を取得
          const { data: { user } } = await client.auth.getUser();
          
          if (user) {
            // ユーザー情報を構築
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
            
            // ユーザー情報を設定
            setCurrentUser(userInfo);
            setIsAuthenticated(true);
            setCompanyId(userInfo.companyId);
            
            // ストレージに保存
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
            try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo)); } catch(e){}
            
            console.log('[Provider] Successfully initialized user from session:', userInfo.email);
            
            // 初期化済みフラグを設定
            alreadyInitialised.current = true;
          }
        } catch (error) {
          console.error('[Provider] Error initializing user from session:', error);
        }
      } else {
        console.log('[Provider] INITIAL_SESSION with no session');
        
        // セッションがない場合でも、ローカルストレージからユーザー情報を復元を試みる
        try {
          const storedUserStr = localStorage.getItem(USER_STORAGE_KEY);
          if (storedUserStr) {
            const storedUser = JSON.parse(storedUserStr) as UserInfo;
            console.log('[Provider] Found stored user, attempting to restore session');
            
            // セッションの復元を試みる
            const { data, error } = await client.auth.refreshSession();
            
            if (error) {
              console.error('[Provider] Failed to restore session:', error);
              // セッションの復元に失敗した場合はストレージをクリア
              localStorage.removeItem(USER_STORAGE_KEY);
              try { sessionStorage.removeItem(USER_STORAGE_KEY); } catch(e){}
            } else if (data.session) {
              console.log('[Provider] Successfully restored session from storage');
              // セッションの復元に成功した場合はユーザー情報を設定
              setCurrentUser(storedUser);
              setIsAuthenticated(true);
              setCompanyId(storedUser.companyId || '');
              
              // 初期化済みフラグを設定
              alreadyInitialised.current = true;
            }
          }
        } catch (error) {
          console.error('[Provider] Error restoring from storage:', error);
        }
      }
      
      return;
    }

    // SIGNED_INイベントの処理
    if (event === 'SIGNED_IN') {
      console.log('[Provider] Processing SIGNED_IN event');
      
      // セッション情報をストレージに明示的に保存
      if (session) {
        saveSessionToStorage(session);
      }
      
      // 既に初期化済みの場合は重複処理を防止
      if (!alreadyInitialised.current) {
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
      } else {
        console.log('[Provider] Skipping duplicate SIGNED_IN processing - already initialized');
      }
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
        // セッション情報をストレージに明示的に保存
        saveSessionToStorage(session);
        
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
  // セッション情報をストレージに明示的に保存する関数
  const saveSessionToStorage = (session: any) => {
    if (!session) return;
    
    try {
      // トークンデータを保存
      const tokenData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in || 3600,
        token_type: session.token_type || 'bearer',
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token
      };
      
      // ローカルストレージとセッションストレージの両方に保存
      localStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-token', JSON.stringify(tokenData));
      try { sessionStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-token', JSON.stringify(tokenData)); } catch(e){}
      
      // セッション情報全体も保存
      const sessionData = {
        session: session,
        user: session.user
      };
      localStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-data', JSON.stringify(sessionData));
      try { sessionStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-data', JSON.stringify(sessionData)); } catch(e){}
      
      console.log('[SessionCheck] Session data explicitly saved to storage');
    } catch (storageError) {
      console.error('[SessionCheck] Error saving session data to storage:', storageError);
    }
  };

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
        console.log('[SessionCheck] No active session found, attempting to restore');
        
        // ローカルストレージからトークンを取得して復元を試みる
        try {
          // まずlocalStorageをチェック
          let tokenStr = localStorage.getItem('sb-czuedairowlwfgbjmfbg-auth-token');
          
          // localStorageになければsessionStorageをチェック
          if (!tokenStr) {
            try {
              tokenStr = sessionStorage.getItem('sb-czuedairowlwfgbjmfbg-auth-token');
            } catch (e) {
              console.error('[SessionCheck] Error accessing sessionStorage:', e);
            }
          }
          
          if (tokenStr) {
            console.log('[SessionCheck] Found auth token in storage, attempting to restore');
            
            try {
              const parsedToken = JSON.parse(tokenStr);
              if (parsedToken?.access_token && parsedToken?.refresh_token) {
                console.log('[SessionCheck] Setting session from stored token');
                
                const { data, error } = await client.auth.setSession({
                  access_token: parsedToken.access_token,
                  refresh_token: parsedToken.refresh_token
                });
                
                if (error) {
                  console.error('[SessionCheck] Error restoring session from token:', error);
                  // 無効なトークンの場合はストレージから削除
                  localStorage.removeItem('sb-czuedairowlwfgbjmfbg-auth-token');
                  try { sessionStorage.removeItem('sb-czuedairowlwfgbjmfbg-auth-token'); } catch(e){}
                  
                  // ログアウト処理
                  handleSessionExpired(setCurrentUser, setIsAuthenticated, setCompanyId);
                } else if (data.session) {
                  console.log('[SessionCheck] Successfully restored session from token');
                  
                  // セッション情報をストレージに明示的に保存
                  saveSessionToStorage(data.session);
                  
                  return; // 成功したら終了
                }
              }
            } catch (e) {
              console.error('[SessionCheck] Error parsing stored token:', e);
            }
          }
        } catch (storageError) {
          console.error('[SessionCheck] Error accessing storage:', storageError);
        }
        
        // 復元に失敗した場合はログアウト処理
        console.log('[SessionCheck] Session restoration failed, logging out');
        handleSessionExpired(setCurrentUser, setIsAuthenticated, setCompanyId);
      } else {
        // セッションの有効期限を確認
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        // 有効期限が30分以内の場合は更新（余裕を持たせる）
        if (expiresAt && expiresAt < now + 30 * 60) {
          console.log('[SessionCheck] Session expiring soon, refreshing');
          
          try {
            // セッションの更新を試みる
            const { data, error } = await client.auth.refreshSession();
            
            if (error) {
              console.error('[SessionCheck] Failed to refresh session:', error);
            } else if (data.session) {
              console.log('[SessionCheck] Session refreshed successfully');
              
              // セッション情報をストレージに明示的に保存
              saveSessionToStorage(data.session);
            }
          } catch (refreshError) {
            console.error('[SessionCheck] Error refreshing session:', refreshError);
          }
        }
      }
    } catch (error) {
      console.error('[SessionCheck] Exception checking session:', error);
    }
  }, 5 * 60 * 1000); // 5分ごと
  
  return intervalId;
};
