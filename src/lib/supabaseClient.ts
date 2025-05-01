import { createBrowserClient } from '@supabase/ssr';

// 環境変数を確実に取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数のチェック
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables for Supabase client');
}

// クライアントサイドでのSupabaseクライアント
export const supabase = createBrowserClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
