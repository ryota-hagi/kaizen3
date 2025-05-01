import { createBrowserClient } from '@supabase/ssr';

// ここではブラウザ用（public）のみ参照
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 1回だけ生成するシングルトン
let instance: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseClient = () => {
  if (!instance) instance = createBrowserClient(url, anon);
  return instance;
};
