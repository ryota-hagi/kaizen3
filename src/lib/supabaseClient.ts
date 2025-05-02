import { createClient } from '@supabase/supabase-js';

// シングルトンパターンを使用して確実に1つのインスタンスのみを使用する
let _client: ReturnType<typeof createClient> | undefined;

export const supabase = () => {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!url || !anon) {
      console.error('Supabase URL or anon key is missing');
      throw new Error('Supabase configuration is incomplete');
    }
    
    // テーブル名を明示的に指定
    console.log('► Creating Supabase client with public schema');
    _client = createClient(url, anon);
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

// 注意: 直接Supabaseクライアントを使用せず、APIルートを経由すること
// 認証関連の操作のみ使用可能
