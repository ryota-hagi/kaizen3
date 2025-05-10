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
        storageKey: 'supabase.auth.token',
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null;
            
            // まずlocalStorageから取得を試みる
            const localValue = localStorage.getItem(key);
            if (localValue) return localValue;
            
            // 次にsessionStorageから取得を試みる
            try {
              return sessionStorage.getItem(key);
            } catch (e) {
              console.error('Error accessing sessionStorage:', e);
              return null;
            }
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return;
            
            // localStorageとsessionStorageの両方に保存
            localStorage.setItem(key, value);
            try {
              sessionStorage.setItem(key, value);
            } catch (e) {
              console.error('Error setting sessionStorage:', e);
            }
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return;
            
            // localStorageとsessionStorageの両方から削除
            localStorage.removeItem(key);
            try {
              sessionStorage.removeItem(key);
            } catch (e) {
              console.error('Error removing from sessionStorage:', e);
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
    if (typeof window !== 'undefined') {
      // localStorageをチェック
      tokenStr = localStorage.getItem('supabase.auth.token');
      
      // localStorageになければsessionStorageをチェック
      if (!tokenStr) {
        try {
          tokenStr = sessionStorage.getItem('supabase.auth.token');
        } catch (e) {
          console.error('[Supabase] Error accessing sessionStorage:', e);
        }
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
