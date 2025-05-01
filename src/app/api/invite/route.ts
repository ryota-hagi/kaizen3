import { createClient } from '@supabase/supabase-js';

// サーバーサイドでのSupabaseクライアント（管理者権限）
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // server only
);

export async function POST(req: Request) {
  try {
    const { email, redirectTo } = await req.json();
    
    // リダイレクトURLを設定（デフォルトはcallbackページ）
    const finalRedirectTo = redirectTo || `${process.env.NEXT_PUBLIC_URL}/auth/callback`;
    
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
