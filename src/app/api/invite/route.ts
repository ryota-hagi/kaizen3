import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, redirectTo } = await req.json();
    
    // 関数内でSupabaseクライアントを作成
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } } // セッション不要
    );
    
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
