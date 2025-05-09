import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // トリガーSQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src/db/migrations/create_workflow_collaborators_trigger.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Supabaseクライアントを初期化
    const client = supabase();
    
    // SQLを実行
    const { error } = await client.rpc('pgmoon', {
      query: sqlContent
    });
    
    if (error) {
      console.error('トリガー適用エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'workflow_collaboratorsテーブルのトリガーが正常に適用されました'
    });
  } catch (error) {
    console.error('トリガー適用中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `トリガー適用エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}
