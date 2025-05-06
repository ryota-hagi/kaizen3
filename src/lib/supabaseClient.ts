import { createClient } from '@supabase/supabase-js';

// シングルトンパターンを使用して確実に1つのインスタンスのみを使用する
let _client: ReturnType<typeof createClient> | undefined;

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
        detectSessionInUrl: true
      }
    });
    console.log('► Created new Supabase client instance');
  } else {
    console.log('► Using existing Supabase client instance');
  }
  
  return _client;
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
      );
    
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
    const client = supabase();
    
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

// app_usersテーブルを作成する関数
export const createAppUsersTable = async () => {
  try {
    const client = supabase();
    
    // app_usersテーブルが存在するか確認
    const { data: existingTable, error: checkError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'app_users')
      .single();
    
    if (!checkError && existingTable) {
      console.log('[Supabase] app_users table already exists');
      return { success: true, message: 'Table already exists' };
    }
    
    // app_usersテーブルを作成
    const { error } = await client.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.app_users (
          id UUID PRIMARY KEY,
          auth_uid UUID UNIQUE NOT NULL,
          email TEXT NOT NULL,
          full_name TEXT,
          role TEXT DEFAULT '一般ユーザー',
          status TEXT DEFAULT 'アクティブ',
          company_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (error) {
      console.error('[Supabase] Error creating app_users table:', error);
      return { success: false, error };
    }
    
    console.log('[Supabase] app_users table created successfully');
    return { success: true, message: 'Table created successfully' };
  } catch (error) {
    console.error('[Supabase] Exception creating app_users table:', error);
    return { success: false, error };
  }
};
