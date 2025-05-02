import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
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
    
    // テーブル一覧を取得するSQLクエリを実行
    const { data, error } = await supabaseAdmin.rpc('get_tables_info');
    
    if (error) {
      console.error('[API] Error getting tables info:', error);
      
      // 代替方法：information_schemaからテーブル一覧を取得
      const { data: tablesData, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (tablesError) {
        console.error('[API] Error getting tables from information_schema:', tablesError);
        return NextResponse.json(
          { success: false, error: tablesError },
          { status: 500 },
        );
      }
      
      return NextResponse.json({ success: true, tables: tablesData });
    }
    
    return NextResponse.json({ success: true, tables: data });
  } catch (error) {
    console.error('[API] Exception in check-tables API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
