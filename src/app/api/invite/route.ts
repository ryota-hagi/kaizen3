import { createClient } from '@supabase/supabase-js';

// 環境変数を確実に取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 環境変数のチェック
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables for Supabase');
  throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// サーバーサイドでのSupabaseクライアント（管理者権限）
const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  try {
    const { email, redirectTo } = await req.json();
    
    // リダイレクトURLを設定（デフォルトはcallbackページ）
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const finalRedirectTo = redirectTo || `${baseUrl}/auth/callback`;
    
    console.log('[API] Inviting user:', email);
    console.log('[API] Redirect URL:', finalRedirectTo);
    
    // Supabaseの招待機能を使用してユーザーを招待
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: finalRedirectTo,
    });
    
    if (error) {
      console.error('[API] Error inviting user:', error);
      return Response.json({ success: false, error }, { status: 400 });
    }
    
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('[API] Exception inviting user:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
