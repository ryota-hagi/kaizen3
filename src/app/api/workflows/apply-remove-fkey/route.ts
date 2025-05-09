import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // SQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src/db/migrations/remove_workflows_created_by_fkey.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Supabase管理者クライアントを使用してSQLを実行
    const adminClient = supabaseAdmin();
    const { data, error } = await adminClient.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('SQLの実行中にエラーが発生しました:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'ワークフローテーブルの外部キー制約を正常に削除しました',
      data
    });
  } catch (error) {
    console.error('エラーが発生しました:', error);
    return NextResponse.json({
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}
