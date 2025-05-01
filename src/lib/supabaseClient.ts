import { createBrowserClient } from '@supabase/ssr';

// クライアントサイドでのSupabaseクライアント
// 関数として定義して、呼び出し時に環境変数を評価する
export const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables for Supabase client');
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// 遅延初期化のためのシングルトンパターン
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const supabase = typeof window !== 'undefined' 
  ? (() => {
      if (!supabaseInstance) {
        supabaseInstance = getSupabaseClient();
      }
      return supabaseInstance;
    })()
  : getSupabaseClient(); // SSRの場合は毎回新しいインスタンスを作成
