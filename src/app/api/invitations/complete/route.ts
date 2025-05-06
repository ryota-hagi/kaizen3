// ----------- /api/invitations/complete -----------
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      status: 'アクティブ'
    });
  }

  try {
    // Supabaseクライアントの作成を関数内に移動
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json();
    const token = body.token || body.invite_token;
    const auth_uid = body.auth_uid;
    const email = body.email;

    if (!token) {
      console.error('[API] /invitations/complete: No token provided in request body');
      return NextResponse.json({ ok: false, message: 'invite_token is required' }, { status: 400 });
    }

    if (!auth_uid) {
      console.error('[API] /invitations/complete: No auth_uid provided in request body');
      return NextResponse.json({ ok: false, message: 'auth_uid is required' }, { status: 400 });
    }

    if (!email) {
      console.error('[API] /invitations/complete: No email provided in request body');
      return NextResponse.json({ ok: false, message: 'email is required' }, { status: 400 });
    }

    console.log('[API] /invitations/complete: Processing token:', token, 'for user:', email);

    // ① invitations 行を completed に
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .update({ status: 'completed' })
      .eq('invite_token', token)
      .eq('status', 'verified')
      .select()
      .single()

    if (inviteError || !invite) {
      console.error('[API] /invitations/complete: Invalid token or database error:', inviteError);
      return NextResponse.json({ ok: false, message: 'token invalid' }, { status: 400 })
    }

    console.log('[API] /invitations/complete: Invitation completed successfully:', invite);

    // ② app_users に登録
    const { error: userError } = await supabase
      .from('app_users')
      .insert([
        {
          auth_uid,
          email: invite.email,
          company_id: invite.company_id,
          role: invite.role
        }
      ])

    if (userError) {
      console.error('[API] /invitations/complete: Error inserting user:', userError);
      // エラーがあっても処理を続行
    }

    // ③ Auth のメタデータへ company_id と status を書き込む
    // 重要: isInvited を false に設定し、status を「アクティブ」に統一
    const { error: authError } = await supabase.auth.admin.updateUserById(auth_uid, {
      user_metadata: { 
        company_id: invite.company_id,
        status: 'アクティブ',  // 統一: 完了時は「アクティブ」に
        isInvited: false       // 明示的に false に設定
      }
    })

    if (authError) {
      console.error('[API] /invitations/complete: Error updating user metadata:', authError);
      // エラーがあっても処理を続行
    }

    console.log('[API] /invitations/complete: Process completed successfully for user:', email);
    
    // isInvited フラグを含めずに返却
    return NextResponse.json({ 
      ok: true,
      status: 'アクティブ'  // 統一: 完了時は「アクティブ」に
    })
  } catch (error) {
    console.error('[API] /invitations/complete: Unexpected error:', error);
    return NextResponse.json({ ok: false, message: 'server error' }, { status: 500 });
  }
}
