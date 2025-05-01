import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // ランタイムで環境変数を確認（ビルド時は実行されない）
  if (!url || !serviceKey) {
    return Response.json(
      { error: 'Supabase env vars are not set' },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { email } = await req.json();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
  });

  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ data });
}
