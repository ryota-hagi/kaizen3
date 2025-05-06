import { NextResponse } from 'next/server';

// ビルド時にエラーが発生しないようにするための対策
// Next.jsのビルド時に実行されないようにする
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // edgeランタイムを使用

export async function POST(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ 
      pong: true,
      message: 'Skipped during build'
    });
  }

  console.log('► PING POST route hit');
  return NextResponse.json({ pong: true });
}

export async function GET(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ 
      pong: true,
      message: 'Skipped during build'
    });
  }

  console.log('► PING GET route hit');
  return NextResponse.json({ pong: true });
}
