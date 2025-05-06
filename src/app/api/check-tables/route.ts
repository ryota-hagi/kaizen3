import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ビルド時にエラーが発生しないようにするための対策
// Next.jsのビルド時に実行されないようにする
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // edgeランタイムを使用

export async function GET(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ success: true, message: 'Skipped during build' });
  }

  try {
    // サーバーサイドでサービスロールキーを使用してSupabaseクライアントを作成
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // 環境変数の確認
    if (!url || !serviceKey) {
      console.error('[API] Supabase env vars are not set');
      return NextResponse.json(
        { success: false, error: 'Supabase env vars are not set' },
        { status: 500 },
      );
    }

    // サービスロールキーを使用したクライアントの作成
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });
    
    // pg_tablesビューを使用してテーブル一覧を取得（こちらはpublicスキーマにあるビュー）
    const { data: tablesData, error: tablesError } = await supabaseAdmin
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('[API] Error getting tables from pg_tables:', tablesError);
      
      // 代替方法：直接REST APIを使用
      const baseUrl = url;
      const apiUrl = `${baseUrl}/rest/v1/`;
      console.log(`[API] Direct API URL: ${apiUrl}`);
      
      try {
        const response = await fetch(`${apiUrl}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API] Error response from Supabase: ${response.status}`, errorText);
          return NextResponse.json(
            { success: false, error: `Supabase API error: ${response.status}` },
            { status: 500 },
          );
        }
        
        const data = await response.json();
        return NextResponse.json({ success: true, endpoints: data });
      } catch (fetchError) {
        console.error('[API] Exception in direct Supabase API call:', fetchError);
        return NextResponse.json(
          { success: false, error: 'Error calling Supabase API directly' },
          { status: 500 },
        );
      }
    }
    
    return NextResponse.json({ success: true, tables: tablesData });
  } catch (error) {
    console.error('[API] Exception in check-tables API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
