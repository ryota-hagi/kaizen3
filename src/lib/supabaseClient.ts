import { createBrowserClient } from '@supabase/ssr';

// ここではブラウザ用（public）のみ参照
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// グローバル変数を使用して確実にシングルトンにする
declare global {
  // eslint-disable-next-line no-var
  var __supabase__: ReturnType<typeof createBrowserClient> | undefined
}

// グローバル変数を使用して確実にシングルトンにする
// 注意: 直接Supabaseクライアントを使用せず、APIルートを経由すること
let supabase: ReturnType<typeof createBrowserClient>;

// 既にインスタンスが存在する場合は再利用し、存在しない場合のみ新規作成
if (globalThis.__supabase__) {
  supabase = globalThis.__supabase__;
  console.log('► Using existing Supabase client instance');
} else {
  supabase = createBrowserClient(url, anon);
  globalThis.__supabase__ = supabase;
  console.log('► Created new Supabase client instance');
}

// 後方互換性のために残す
export const getSupabaseClient = () => {
  return supabase;
};

// 注意: 直接Supabaseクライアントを使用せず、APIルートを経由すること
// 認証関連の操作のみ使用可能
