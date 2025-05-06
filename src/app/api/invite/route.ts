import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ビルド時にエラーが発生しないようにするための対策
// Next.jsのビルド時に実行されないようにする
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // edgeランタイムを使用

export async function POST(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ 
      data: null,
      message: 'Skipped during build'
    });
  }

  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // ランタイムで環境変数を確認（ビルド時は実行されない）
  if (!url || !serviceKey) {
    return NextResponse.json(
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

  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ data });
}
