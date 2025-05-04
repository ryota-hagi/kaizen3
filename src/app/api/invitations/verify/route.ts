// ----------- /api/invitations/verify -----------
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { token } = await req.json()

  // ① token 検証
  const { data, error } = await supabase
    .from('invitations')
    .update({ status: 'verified' })
    .eq('invite_token', token)
    .eq('status', 'pending')            // 二重クリック防止
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, message: 'invalid token' }, { status: 404 })
  }

  // ② 会社情報だけ返却
  const { company_id, email, role } = data
  return NextResponse.json({ ok: true, company_id, email, role })
}
