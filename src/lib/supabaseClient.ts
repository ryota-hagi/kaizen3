/**
 * Supabaseクライアント管理と認証関連の処理を行うモジュール
 * 
 * このモジュールは以下の機能を提供します：
 * 1. Supabaseクライアントの初期化と管理（シングルトンパターン）
 * 2. 認証関連の処理（セッション管理、ユーザー情報の保存など）
 * 3. データベース操作のユーティリティ関数
 */

import { createClient } from '@supabase/supabase-js';

// シングルトンパターンを使用して確実に1つのインスタンスのみを使用する
let _client: ReturnType<typeof createClient> | undefined;
let _adminClient: ReturnType<typeof createClient> | undefined;

// ストレージキー定数
const AUTH_TOKEN_KEY = 'sb-czuedairowlwfgbjmfbg-auth-token';
const AUTH_DATA_KEY = 'sb-czuedairowlwfgbjmfbg-auth-data';
const SESSION_CACHE_KEY = 'sb-session-cache';

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
 * localStorage と sessionStorage の両方を使用し、
 * エラーハンドリングを行います
 */
const storage = {
  // メモリキャッシュ
  _cache: new Map<string, string>(),
  
  // ストレージからデータを取得
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
  
  // ストレージにデータを保存
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
  
  // ストレージからデータを削除
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
  
  // キャッシュをクリア
  clearCache: (): void => {
    storage._cache.clear();
  }
};

/**
 * 標準のSupabaseクライアントを取得する関数
 * シングルトンパターンを使用して、アプリケーション全体で1つのインスタンスのみを使用
 */
export const supabase = () => {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!url || !anon) {
      throw new Error('Supabase configuration is incomplete');
    }
    
    _client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_TOKEN_KEY,
        flowType: 'implicit',
        storage,
        // デバッグログを無効化
        debug: false
      },
      // グローバルエラーハンドラー
      global: {
        fetch: (...args) => {
          return fetch(...args);
        }
      },
      // キャッシュ戦略
      realtime: {
        params: {
          eventsPerSecond: 5 // イベント頻度を制限
        }
      }
    });
    
    log('► Creating Supabase client with public schema');
    log('► Created new Supabase client instance');
  } else {
    log('► Using existing Supabase client instance');
  }
  
  return _client;
};

/**
 * サーバーサイド専用の管理者権限を持つSupabaseクライアントを取得する関数
 * 注意: このクライアントはサーバーサイドでのみ使用してください
 */
export const supabaseAdmin = () => {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !serviceRoleKey) {
      throw new Error('Supabase admin configuration is incomplete');
    }
    
    _adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return _adminClient;
};

// 後方互換性のために残す
export const getSupabaseClient = () => supabase();

/**
 * セッション情報をストレージに保存する関数
 * @param session セッション情報
 * @param extendExpiry 有効期限を延長するかどうか（デフォルト: false）
 */
export const saveSessionToStorage = async (session: any, extendExpiry = false) => {
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
    storage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokenData));
    
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
    storage.setItem(AUTH_DATA_KEY, JSON.stringify(sessionData));
    
    // セッションキャッシュも更新
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: true,
      timestamp: now,
      expiresAt
    }));
    
    if (extendExpiry) {
      log('[Supabase Storage] Token saved with expiry:', new Date(expiresAt * 1000).toISOString());
    }
  } catch (error) {
    console.error('[Auth] Error saving session data:', error);
  }
};

/**
 * ユーザー情報をapp_usersテーブルに保存する関数
 * @param userId ユーザーID
 * @param userData ユーザー情報
 */
export const saveUserToDatabase = async (userId: string, userData: any) => {
  try {
    const client = supabase();
    
    // 現在のタイムスタンプ
    const now = new Date().toISOString();
    
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
          created_at: userData.createdAt || now,
          updated_at: now,
          last_login: now
        },
        { onConflict: 'auth_uid' }
      )
      .select();
    
    if (error) {
      return { success: false, error };
    }
    
    log('[Supabase] User saved to database successfully:', data);
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * ユーザー情報をapp_usersテーブルから取得する関数
 * @param userId ユーザーID
 */
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
      return { success: false, error };
    }
    
    log('[Supabase] User retrieved from database successfully:', data);
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * ユーザーメタデータを更新する関数（管理者権限が必要）
 * @param userId ユーザーID
 * @param metadata 更新するメタデータ
 */
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
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * テーブルの存在を確認する汎用関数
 * @param tableName テーブル名
 */
const checkTableExists = async (tableName: string) => {
  try {
    const client = supabase();
    
    // テーブルにクエリを実行してテーブルの存在を確認
    const { data, error } = await client
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error) {
      log(`[Supabase] ${tableName} table check error:`, error);
      return { success: false, error, exists: false };
    }
    
    log(`[Supabase] ${tableName} table exists`);
    return { success: true, exists: true };
  } catch (error) {
    return { success: false, error, exists: false };
  }
};

// app_usersテーブルを確認する関数
export const checkAppUsersTable = async () => {
  return checkTableExists('app_users');
};

// companiesテーブルを確認する関数
export const checkCompaniesTable = async () => {
  return checkTableExists('companies');
};

// invitationsテーブルを確認する関数
export const checkInvitationsTable = async () => {
  return checkTableExists('invitations');
};

/**
 * セッションの有効性を確認する関数
 * セッションがない場合はストレージから復元を試みる
 * セッションの有効期限が切れている場合は更新を試みる
 */
export const validateSession = async () => {
  try {
    // まずキャッシュを確認
    const sessionCacheStr = storage.getItem(SESSION_CACHE_KEY);
    if (sessionCacheStr) {
      try {
        const sessionCache = JSON.parse(sessionCacheStr);
        const now = Math.floor(Date.now() / 1000);
        
        // キャッシュが有効で、最後の確認から5分以内の場合はキャッシュを使用
        if (sessionCache.valid && sessionCache.timestamp > now - 5 * 60) {
          // セッションの有効期限が60分以上残っている場合はキャッシュを使用
          if (sessionCache.expiresAt > now + 60 * 60) {
            log('[Supabase] Using cached session validation');
            
            // Supabaseクライアントからセッションを取得
            const client = supabase();
            const { data: { session } } = await client.auth.getSession();
            
            if (session) {
              return { valid: true, session };
            }
          }
        }
      } catch (e) {
        // キャッシュの解析エラーは無視
      }
    }
    
    // Supabaseクライアントからセッションを取得
    const client = supabase();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      log('[Supabase] Session validation error:', error);
      return { valid: false, error };
    }
    
    if (!session) {
      // セッションがない場合はストレージからトークンを取得して復元を試みる
      const tokenStr = storage.getItem(AUTH_TOKEN_KEY);
      
      if (tokenStr) {
        try {
          const parsedToken = JSON.parse(tokenStr);
          if (parsedToken?.access_token) {
            const { data, error } = await client.auth.setSession({
              access_token: parsedToken.access_token,
              refresh_token: parsedToken.refresh_token
            });
            
            if (error) {
              log('[Supabase] Session restoration error:', error);
              
              // セッションキャッシュを無効化
              storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                valid: false,
                timestamp: Math.floor(Date.now() / 1000)
              }));
              
              return { valid: false, error };
            }
            
            if (data.session) {
              log('[Supabase] Session restored from storage');
              
              // セッションキャッシュを更新
              storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                valid: true,
                timestamp: Math.floor(Date.now() / 1000),
                expiresAt: data.session.expires_at
              }));
              
              return { valid: true, session: data.session };
            }
          }
        } catch (e) {
          // エラーは無視
        }
      }
      
      log('[Supabase] No session found');
      
      // セッションキャッシュを無効化
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: false,
        timestamp: Math.floor(Date.now() / 1000)
      }));
      
      return { valid: false };
    }
    
    // セッションの有効期限を確認
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    // セッションキャッシュを更新
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: true,
      timestamp: now,
      expiresAt
    }));
    
    // 有効期限が60分以内の場合は更新（余裕を持たせる）
    if (expiresAt && expiresAt < now + 60 * 60) {
      try {
        // セッションの更新を試みる
        log('[Supabase] Session expiring soon, attempting refresh');
        const { data, error } = await client.auth.refreshSession();
        
        if (error || !data.session) {
          log('[Supabase] Session refresh error:', error);
          return { valid: false, expired: true, error };
        }
        
        // 更新されたセッションをストレージに保存
        await saveSessionToStorage(data.session, true);
        log('[Supabase] Session refreshed successfully');
        
        // セッションキャッシュを更新
        storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
          valid: true,
          timestamp: now,
          expiresAt: data.session.expires_at
        }));
        
        return { valid: true, session: data.session };
      } catch (refreshError) {
        log('[Supabase] Session refresh exception:', refreshError);
        return { valid: false, expired: true, error: refreshError };
      }
    }
    
    log('[Supabase] Session is valid');
    return { valid: true, session };
  } catch (error) {
    log('[Supabase] Session validation exception:', error);
    
    // セッションキャッシュを無効化
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: false,
      timestamp: Math.floor(Date.now() / 1000)
    }));
    
    return { valid: false, error };
  }
};

/**
 * 認証関連のストレージをクリアする関数
 * ログアウト時などに使用
 */
export const clearAuthStorage = () => {
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(AUTH_DATA_KEY);
  storage.removeItem(SESSION_CACHE_KEY);
  storage.clearCache();
};

/**
 * セッションを更新する関数
 * セッションの有効期限が切れる前に呼び出すことで、
 * ユーザーがログアウトされるのを防ぐ
 */
export const refreshSession = async () => {
  try {
    const client = supabase();
    
    // 現在のセッションを取得
    const { data: { session: currentSession } } = await client.auth.getSession();
    
    // 現在のセッションがない場合は更新できない
    if (!currentSession) {
      // セッションキャッシュを無効化
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: false,
        timestamp: Math.floor(Date.now() / 1000)
      }));
      
      return { success: false, error: 'No current session' };
    }
    
    // 現在の時刻とセッションの有効期限を確認
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = currentSession.expires_at;
    
    // 有効期限が60分以上残っている場合は更新せず、有効期限だけ延長
    if (expiresAt && expiresAt > now + 60 * 60) {
      await saveSessionToStorage(currentSession, true);
      
      // セッションキャッシュを更新
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: true,
        timestamp: now,
        expiresAt: now + 24 * 60 * 60 // 24時間
      }));
      
      return { success: true, session: currentSession };
    }
    
    // セッションを更新
    const { data, error } = await client.auth.refreshSession();
    
    if (error) {
      log('[Supabase] Session refresh error:', error);
      
      // セッションキャッシュを無効化
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: false,
        timestamp: now
      }));
      
      return { success: false, error };
    }
    
    if (data.session) {
      // セッション情報をストレージに保存
      await saveSessionToStorage(data.session, true);
      log('[Supabase] Session refreshed and saved with extended expiry');
      
      // セッションキャッシュを更新
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: true,
        timestamp: now,
        expiresAt: data.session.expires_at
      }));
      
      return { success: true, session: data.session };
    }
    
    // セッションキャッシュを無効化
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: false,
      timestamp: now
    }));
    
    return { success: false };
  } catch (error) {
    log('[Supabase] Session refresh exception:', error);
    
    // セッションキャッシュを無効化
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: false,
      timestamp: Math.floor(Date.now() / 1000)
    }));
    
    return { success: false, error };
  }
};

/**
 * セッションの有効期限を延長する関数
 * 現在のセッションを取得し、有効期限を延長してストレージに保存
 */
export const extendSessionExpiry = async () => {
  try {
    const client = supabase();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error || !session) {
      // セッションキャッシュを無効化
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        valid: false,
        timestamp: Math.floor(Date.now() / 1000)
      }));
      
      return { success: false, error };
    }
    
    // セッション情報をストレージに保存（有効期限を延長）
    await saveSessionToStorage(session, true);
    
    // セッションキャッシュを更新
    const now = Math.floor(Date.now() / 1000);
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: true,
      timestamp: now,
      expiresAt: now + 24 * 60 * 60 // 24時間
    }));
    
    return { success: true, session };
  } catch (error) {
    // セッションキャッシュを無効化
    storage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      valid: false,
      timestamp: Math.floor(Date.now() / 1000)
    }));
    
    return { success: false, error };
  }
};

/**
 * 認証状態を一元管理するための関数
 * アプリケーション起動時に呼び出すことで、
 * セッションの有効性を確認し、必要に応じて更新する
 */
export const initializeAuth = async () => {
  try {
    // セッションの有効性を確認
    const { valid, session } = await validateSession();
    
    if (!valid || !session) {
      return { success: false };
    }
    
    // セッション情報をストレージに保存（有効期限を延長）
    await saveSessionToStorage(session, true);
    
    return { success: true, session };
  } catch (error) {
    return { success: false, error };
  }
};
