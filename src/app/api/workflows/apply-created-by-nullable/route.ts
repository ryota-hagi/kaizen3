import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const client = supabaseAdmin();
    
    // SQLクエリの読み込み
    const sqlQuery = `
      -- created_byカラムをNULL許容に変更
      ALTER TABLE workflows ALTER COLUMN created_by DROP NOT NULL;
      
      -- 既存のNULLのcreated_byを持つレコードを修正するためのインデックスを作成
      CREATE INDEX IF NOT EXISTS workflows_null_created_by_idx ON workflows((created_by IS NULL)) WHERE created_by IS NULL;
    `;
    
    // SQLの実行
    const { data, error } = await client.rpc('exec_sql', { sql_query: sqlQuery });
    
    if (error) {
      console.error('SQLの実行エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'ワークフローテーブルのcreated_byカラムをNULL許容に変更しました。'
    });
  } catch (error: any) {
    console.error('エラー:', error);
    return NextResponse.json({ 
      error: `マイグレーションの適用中にエラーが発生しました: ${error.message || error}` 
    }, { status: 500 });
  }
}
