import { createClient } from '@supabase/supabase-js';

// シングルトンパターンを使用して確実に1つのインスタンスのみを使用する
let _client: ReturnType<typeof createClient> | undefined;
let _adminClient: ReturnType<typeof createClient> | undefined;

export const supabase = () => {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!url || !anon) {
      console.error('Supabase URL or anon key is missing');
      throw new Error('Supabase configuration is incomplete');
    }
    
    // テーブル名を明示的に指定
    console.log('► Creating Supabase client with public schema');
    _client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-czuedairowlwfgbjmfbg-auth-token', // 明示的にストレージキーを指定
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null;
            
            // まずlocalStorageから取得を試みる
            const localValue = localStorage.getItem(key);
            if (localValue) {
              console.log('[Supabase Storage] Retrieved token from localStorage');
              return localValue;
            }
            
            // 次にsessionStorageから取得を試みる
            try {
              const sessionValue = sessionStorage.getItem(key);
              if (sessionValue) {
                console.log('[Supabase Storage] Retrieved token from sessionStorage');
                // sessionStorageから取得した場合はlocalStorageにも保存
                try {
                  localStorage.setItem(key, sessionValue);
                  console.log('[Supabase Storage] Copied token from sessionStorage to localStorage');
                } catch (e) {
                  console.error('[Supabase Storage] Error copying to localStorage:', e);
                }
                return sessionValue;
              }
            } catch (e) {
              console.error('[Supabase Storage] Error accessing sessionStorage:', e);
            }
            
            // auth-dataキーからトークンを取得を試みる
            const dataKey = key.replace('-auth-token', '-auth-data');
            try {
              const dataValue = localStorage.getItem(dataKey);
              if (dataValue) {
                console.log('[Supabase Storage] Retrieved session data from localStorage');
                try {
                  const parsedData = JSON.parse(dataValue);
                  if (parsedData.session) {
                    const tokenData = {
                      access_token: parsedData.session.access_token,
                      refresh_token: parsedData.session.refresh_token,
                      expires_at: parsedData.session.expires_at,
                      expires_in: parsedData.session.expires_in,
                      token_type: parsedData.session.token_type,
                      provider_token: parsedData.session.provider_token,
                      provider_refresh_token: parsedData.session.provider_refresh_token
                    };
                    const tokenStr = JSON.stringify(tokenData);
                    
                    // トークンデータをストレージに保存
                    try {
                      localStorage.setItem(key, tokenStr);
                      sessionStorage.setItem(key, tokenStr);
                      console.log('[Supabase Storage] Restored token from session data');
                    } catch (e) {
                      console.error('[Supabase Storage] Error saving restored token:', e);
                    }
                    
                    return tokenStr;
                  }
                } catch (e) {
                  console.error('[Supabase Storage] Error parsing session data:', e);
                }
              }
            } catch (e) {
              console.error('[Supabase Storage] Error accessing auth-data:', e);
            }
            
            console.log('[Supabase Storage] No token found in storage');
            return null;
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return;
            
            // localStorageとsessionStorageの両方に保存
            try {
              localStorage.setItem(key, value);
              console.log('[Supabase Storage] Token saved to localStorage');
            } catch (e) {
              console.error('[Supabase Storage] Error setting localStorage:', e);
            }
            
            try {
              sessionStorage.setItem(key, value);
              console.log('[Supabase Storage] Token saved to sessionStorage');
            } catch (e) {
              console.error('[Supabase Storage] Error setting sessionStorage:', e);
            }
            
            // 保存したトークンの内容をログに出力（デバッグ用）
            try {
              const parsed = JSON.parse(value);
              const expiresAt = parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'unknown';
              console.log(`[Supabase Storage] Token saved with expiry: ${expiresAt}`);
            } catch (e) {
              console.error('[Supabase Storage] Error parsing token for logging:', e);
            }
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return;
            
            // localStorageとsessionStorageの両方から削除
            try {
              localStorage.removeItem(key);
              console.log('[Supabase Storage] Token removed from localStorage');
            } catch (e) {
              console.error('[Supabase Storage] Error removing from localStorage:', e);
            }
            
            try {
              sessionStorage.removeItem(key);
              console.log('[Supabase Storage] Token removed from sessionStorage');
            } catch (e) {
              console.error('[Supabase Storage] Error removing from sessionStorage:', e);
            }
            
            // auth-dataキーも削除
            const dataKey = key.replace('-auth-token', '-auth-data');
            try {
              localStorage.removeItem(dataKey);
              console.log('[Supabase Storage] Session data removed from localStorage');
            } catch (e) {
              console.error('[Supabase Storage] Error removing session data from localStorage:', e);
            }
            
            try {
              sessionStorage.removeItem(dataKey);
              console.log('[Supabase Storage] Session data removed from sessionStorage');
            } catch (e) {
              console.error('[Supabase Storage] Error removing session data from sessionStorage:', e);
            }
          }
        }
      }
    });
    console.log('► Created new Supabase client instance');
  } else {
    console.log('► Using existing Supabase client instance');
  }
  
  return _client;
};

// サーバーサイド専用の管理者権限を持つSupabaseクライアント
export const supabaseAdmin = () => {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !serviceRoleKey) {
      console.error('Supabase URL or service role key is missing');
      throw new Error('Supabase admin configuration is incomplete');
    }
    
    console.log('► Creating Supabase admin client');
    _adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('► Created new Supabase admin client instance');
  } else {
    console.log('► Using existing Supabase admin client instance');
  }
  
  return _adminClient;
};

// 後方互換性のために残す
export const getSupabaseClient = () => {
  return supabase();
};

// ユーザー情報をapp_usersテーブルに保存する関数
export const saveUserToDatabase = async (userId: string, userData: any) => {
  try {
    const client = supabase();
    
    // app_usersテーブルにユーザー情報を保存/更新
    const { data, error } = await client
      .from('app_users')
      .upsert(
        {
          id: userId,
          auth_uid: userId,
          email: userData.email,
          full_name: userData.fullName || '',
          company_id: userData.companyId || '',
          role: userData.role || '一般ユーザー',
          status: userData.status || 'アクティブ',
          created_at: userData.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        },
        { onConflict: 'auth_uid' }
      )
      .select();
    
    if (error) {
      console.error('[Supabase] Error saving user to database:', error);
      return { success: false, error };
    }
    
    console.log('[Supabase] User saved to database successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception saving user to database:', error);
    return { success: false, error };
  }
};

// ユーザー情報をapp_usersテーブルから取得する関数
export const getUserFromDatabase = async (userId: string) => {
  try {
    const client = supabase();
    
    // app_usersテーブルからユーザー情報を取得
    const { data, error } = await client
      .from('app_users')
      .select('*')
      .eq('auth_uid', userId)
      .single();
    
    if (error) {
      console.error('[Supabase] Error getting user from database:', error);
      return { success: false, error };
    }
    
    console.log('[Supabase] User retrieved from database successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception getting user from database:', error);
    return { success: false, error };
  }
};

// ユーザーメタデータを更新する関数
export const updateUserMetadata = async (userId: string, metadata: any) => {
  try {
    // 管理者権限を持つクライアントを使用
    const client = supabaseAdmin();
    
    // ユーザーメタデータを更新
    const { data, error } = await client.auth.admin.updateUserById(
      userId,
      { user_metadata: metadata }
    );
    
    if (error) {
      console.error('[Supabase] Error updating user metadata:', error);
      return { success: false, error };
    }
    
    console.log('[Supabase] User metadata updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception updating user metadata:', error);
    return { success: false, error };
  }
};

// app_usersテーブルを確認する関数
export const checkAppUsersTable = async () => {
  try {
    const client = supabase();
    
    // app_usersテーブルにクエリを実行してテーブルの存在を確認
    const { data, error } = await client
      .from('app_users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('[Supabase] Error checking app_users table:', error);
      return { success: false, error, exists: false };
    }
    
    console.log('[Supabase] app_users table exists');
    return { success: true, exists: true };
  } catch (error) {
    console.error('[Supabase] Exception checking app_users table:', error);
    return { success: false, error, exists: false };
  }
};

// invitationsテーブルを確認する関数
export const checkInvitationsTable = async () => {
  try {
    const client = supabase();
    
    // invitationsテーブルにクエリを実行してテーブルの存在を確認
    const { data, error } = await client
      .from('invitations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('[Supabase] Error checking invitations table:', error);
      return { success: false, error, exists: false };
    }
    
    console.log('[Supabase] invitations table exists');
    return { success: true, exists: true };
  } catch (error) {
    console.error('[Supabase] Exception checking invitations table:', error);
    return { success: false, error, exists: false };
  }
};

// セッションの有効性を確認する関数
export const validateSession = async () => {
  try {
    // まずlocalStorageとsessionStorageを直接チェック
    let tokenStr = null;
    let sessionData = null;
    const storageKey = 'sb-czuedairowlwfgbjmfbg-auth-token'; // 明示的にストレージキーを指定
    const dataKey = 'sb-czuedairowlwfgbjmfbg-auth-data'; // セッションデータのキー
    
    if (typeof window !== 'undefined') {
      // localStorageをチェック
      tokenStr = localStorage.getItem(storageKey);
      
      // localStorageになければsessionStorageをチェック
      if (!tokenStr) {
        try {
          tokenStr = sessionStorage.getItem(storageKey);
        } catch (e) {
          console.error('[Supabase] Error accessing sessionStorage:', e);
        }
      }
      
      // auth-dataキーをチェック（トークンの有無に関わらず）
      try {
        const dataValue = localStorage.getItem(dataKey);
        if (dataValue) {
          console.log('[Supabase] Found session data in localStorage');
          try {
            sessionData = JSON.parse(dataValue);
            
            // トークンがなければauth-dataからトークンを復元
            if (!tokenStr && sessionData.session) {
              const tokenData = {
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
                expires_at: sessionData.session.expires_at,
                expires_in: sessionData.session.expires_in || 3600,
                token_type: sessionData.session.token_type || 'bearer',
                provider_token: sessionData.session.provider_token,
                provider_refresh_token: sessionData.session.provider_refresh_token
              };
              tokenStr = JSON.stringify(tokenData);
              
              // トークンデータをストレージに保存
              try {
                localStorage.setItem(storageKey, tokenStr);
                sessionStorage.setItem(storageKey, tokenStr);
                console.log('[Supabase] Restored token from session data');
              } catch (e) {
                console.error('[Supabase] Error saving restored token:', e);
              }
            }
          } catch (e) {
            console.error('[Supabase] Error parsing session data:', e);
          }
        }
      } catch (e) {
        console.error('[Supabase] Error accessing auth-data:', e);
      }
      
      if (tokenStr) {
        console.log('[Supabase] Found auth token in storage');
      }
    }
    
    // Supabaseクライアントからセッションを取得
    const client = supabase();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Session validation error:', error);
      return { valid: false, error };
    }
    
    if (!session) {
      console.log('[Supabase] No active session found during validation');
      
      // セッションがないがトークンがある場合は、トークンを使ってセッションを復元
      if (tokenStr) {
        try {
          console.log('[Supabase] Attempting to restore session from token');
          const parsedToken = JSON.parse(tokenStr);
          if (parsedToken?.access_token) {
            const { data, error } = await client.auth.setSession({
              access_token: parsedToken.access_token,
              refresh_token: parsedToken.refresh_token
            });
            
            if (error) {
              console.error('[Supabase] Error restoring session from token:', error);
              return { valid: false, error };
            }
            
            if (data.session) {
              console.log('[Supabase] Successfully restored session from token');
              return { valid: true, session: data.session };
            }
          }
        } catch (e) {
          console.error('[Supabase] Error parsing or using stored token:', e);
        }
      }
      
      return { valid: false };
    }
    
    // セッションの有効期限を確認
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && expiresAt < now) {
      console.log('[Supabase] Session expired, attempting to refresh');
      
      try {
        // セッションの更新を試みる
        const { data, error } = await client.auth.refreshSession();
        
        if (error || !data.session) {
          console.error('[Supabase] Failed to refresh session:', error);
          return { valid: false, expired: true, error };
        }
        
        console.log('[Supabase] Session refreshed successfully');
        return { valid: true, session: data.session };
      } catch (refreshError) {
        console.error('[Supabase] Error refreshing session:', refreshError);
        return { valid: false, expired: true, error: refreshError };
      }
    }
    
    console.log('[Supabase] Session is valid');
    return { valid: true, session };
  } catch (error) {
    console.error('[Supabase] Session validation exception:', error);
    return { valid: false, error };
  }
};
