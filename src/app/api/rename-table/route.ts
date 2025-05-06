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
    return NextResponse.json({ success: true, message: 'Skipped during build' });
  }

  try {
    // リクエストボディを取得
    const body = await req.json();
    const { oldTable, newTable } = body;
    
    // テーブル名の検証
    if (!oldTable || !newTable) {
      return NextResponse.json(
        { success: false, error: 'oldTable and newTable are required' },
        { status: 400 },
      );
    }
    
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
    
    // テーブルリネームのSQLを生成
    const renameTableSQL = `ALTER TABLE ${oldTable} RENAME TO ${newTable};`;
    
    // Supabaseの管理コンソールでSQLを実行するか、
    // 別の方法でテーブルをリネームする必要があります
    console.log('[API] Please rename the table manually using the Supabase dashboard');
    console.log('[API] SQL to rename table:', renameTableSQL);
    
    // 代替方法：直接REST APIを使用してテーブルの存在を確認
    try {
      // 元のテーブルが存在するか確認
      const { count: oldTableCount, error: oldTableError } = await supabaseAdmin
        .from(oldTable)
        .select('*', { count: 'exact', head: true });
      
      const oldTableExists = !oldTableError;
      
      // 新しいテーブル名が既に存在するか確認
      const { count: newTableCount, error: newTableError } = await supabaseAdmin
        .from(newTable)
        .select('*', { count: 'exact', head: true });
      
      const newTableExists = !newTableError;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Please rename the table manually using the Supabase dashboard',
        sql: renameTableSQL,
        oldTableExists,
        newTableExists,
        oldTableCount,
        newTableCount
      });
    } catch (error) {
      console.error('[API] Error checking tables:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error checking tables',
        sql: renameTableSQL
      });
    }
  } catch (error) {
    console.error('[API] Exception in rename-table API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
