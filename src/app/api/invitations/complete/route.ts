// ----------- /api/invitations/complete -----------
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { token, auth_uid } = await req.json()

  // ① invitations 行を completed に
  const { data: invite } = await supabase
    .from('invitations')
    .update({ status: 'completed' })
    .eq('invite_token', token)
    .eq('status', 'verified')
    .select()
    .single()

  if (!invite) {
    return NextResponse.json({ ok: false, message: 'token invalid' }, { status: 400 })
  }

  // ② app_users に登録
  await supabase
    .from('app_users')
    .insert([
      {
        auth_uid,
        email: invite.email,
        company_id: invite.company_id,
        role: invite.role
      }
    ])

  // ③ Auth のメタデータへ company_id を書き込む
  await supabase.auth.admin.updateUserById(auth_uid, {
    user_metadata: { company_id: invite.company_id }
  })

  return NextResponse.json({ ok: true })
}
