import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    // リクエストからプロジェクトIDを取得（指定がない場合はデフォルト値を使用）
    const body = await request.json().catch(() => ({}));
    const projectId = body.projectId || 'czuedairowlwfgbjmfbg';
    
    // トリガーSQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src/db/migrations/create_workflow_collaborators_trigger.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Supabaseクライアントを初期化
    const client = supabase();
    
    try {
      // SQLを直接実行
      const { data, error } = await client.rpc('pgmoon', {
        query: sqlContent
      });
      
      if (error) {
        console.error('トリガー適用エラー:', error);
        return NextResponse.json({ 
          success: false, 
          message: `トリガーの適用に失敗しました: ${error.message}` 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'workflow_collaboratorsテーブルのトリガーが正常に適用されました',
        result: data
      });
    } catch (execError) {
      console.error('SQL実行エラー:', execError);
      return NextResponse.json({ 
        success: false, 
        message: `トリガーの適用に失敗しました: ${execError instanceof Error ? execError.message : '不明なエラー'}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('トリガー適用中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `トリガー適用エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}

// GETメソッドも同様に処理（静的生成のエラーを回避するため）
export async function GET() {
  return NextResponse.json({ 
    success: false, 
    message: 'このエンドポイントはPOSTメソッドのみをサポートしています'
  }, { status: 405 });
}
