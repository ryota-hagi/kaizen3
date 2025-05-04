// ----------- /api/invitations/verify -----------
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token || body.invite_token;

    if (!token) {
      console.error('[API] /invitations/verify: No token provided in request body');
      return NextResponse.json({ ok: false, message: 'token is required' }, { status: 400 });
    }

    console.log('[API] /invitations/verify: Verifying token:', token);

    // ① token 検証
    const { data, error } = await supabase
      .from('invitations')
      .update({ status: 'verified' })
      .eq('invite_token', token)
      .eq('status', 'pending')            // 二重クリック防止
      .select()
      .single()

    if (error || !data) {
      console.error('[API] /invitations/verify: Invalid token or database error:', error);
      return NextResponse.json({ ok: false, message: 'invalid token' }, { status: 404 })
    }

    console.log('[API] /invitations/verify: Token verified successfully:', data);

    // ② 会社情報だけ返却
    const { company_id, email, role } = data
    return NextResponse.json({ ok: true, company_id, email, role })
  } catch (error) {
    console.error('[API] /invitations/verify: Unexpected error:', error);
    return NextResponse.json({ ok: false, message: 'server error' }, { status: 500 });
  }
}
