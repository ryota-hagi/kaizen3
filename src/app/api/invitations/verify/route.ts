// ----------- /api/invitations/verify -----------
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { INVITATIONS_VIEW } from '@/constants/invitations'

// ビルド時にエラーが発生しないようにするための対策
// Next.jsのビルド時に実行されないようにする
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // edgeランタイムを使用

export async function POST(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ 
      ok: true, 
      message: 'Skipped during build',
      valid: true,
      invitation: null
    });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json();
    const token = body.token || body.invite_token;
    const companyId = body.companyId || body.company_id;

    if (!token) {
      console.error('[API] /invitations/verify: No token provided in request body');
      return NextResponse.json({ ok: false, message: 'token is required' }, { status: 400 });
    }

    console.log('[API] /invitations/verify: Verifying token:', token);
    
    // クエリ条件を構築
    let query = supabase
      .from(INVITATIONS_VIEW)
      .select('*')
      .eq('invite_token', token);  // snake_case を使用
    
    // 会社IDが指定されている場合は、会社IDも一致するものだけを対象にする
    if (companyId) {
      console.log('[API] /invitations/verify: Also checking company ID:', companyId);
      query = query.eq('company_id', companyId);
    }
    
    // token と company_id の検証
    const { data, error } = await query.single();

    if (error || !data) {
      console.error('[API] /invitations/verify: Invalid token or database error:', error);
      return NextResponse.json({ 
        ok: false, 
        message: 'invalid token',
        valid: false,
        invitation: null
      }, { status: 404 })
    }

    console.log('[API] /invitations/verify: Token verified successfully:', data);

    // ② 会社情報だけ返却 - isInvited フラグは含めない
    const { company_id, email, role } = data
    return NextResponse.json({ 
      ok: true, 
      company_id, 
      email, 
      role,
      status: 'アクティブ',  // 統一: 完了時は「アクティブ」に
      valid: true,
      invitation: {
        ...data,
        companyId: company_id,
        status: 'アクティブ'
      }
    })
  } catch (error) {
    console.error('[API] /invitations/verify: Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      message: 'server error',
      valid: false,
      invitation: null
    }, { status: 500 });
  }
}
