import { NextRequest, NextResponse } from 'next/server';

// 明示的に動的ルートとして設定
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // URLからトークンを取得
    const token = req.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'トークンが指定されていません' 
      }, { status: 400 });
    }
    
    // サービスロールキーを使用してRLSをバイパス
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // invitationsテーブルからトークンを検索（tokenまたはinvite_tokenで検索）
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .or(`token.eq.${token},invite_token.eq.${token}`)
      .is('accepted_at', null)
      .single();
    
    if (error || !data) {
      console.error('[Supabase] Error verifying invite token:', error);
      return NextResponse.json({ 
        valid: false, 
        error: '無効な招待トークンです' 
      }, { status: 404 });
    }
    
    // 有効期限のチェック
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ 
        valid: false, 
        error: '招待の有効期限が切れています' 
      }, { status: 410 });
    }
    
    // 招待情報を返す
    return NextResponse.json({ 
      valid: true, 
      invitation: {
        id: data.id,
        email: data.email,
        company_id: data.company_id,
        role: data.role,
        full_name: data.full_name || '',
        invited_by: data.invited_by,
        created_at: data.created_at,
        expires_at: data.expires_at
      }
    });
  } catch (error) {
    console.error('[Supabase] Exception verifying invite token:', error);
    return NextResponse.json({ 
      valid: false, 
      error: '招待の検証中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
