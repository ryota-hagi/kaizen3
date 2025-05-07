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
