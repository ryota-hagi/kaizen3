import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // トリガーSQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src/db/migrations/create_workflow_collaborators_trigger.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // URLからプロジェクトIDを取得（クエリパラメータがない場合はデフォルト値を使用）
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'czuedairowlwfgbjmfbg';
    
    try {
      // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
      const result = await global.use_mcp_tool(
        'github.com/supabase-community/supabase-mcp',
        'execute_sql',
        {
          project_id: projectId,
          query: sqlContent
        }
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'workflow_collaboratorsテーブルのトリガーが正常に適用されました',
        result
      });
    } catch (mcpError) {
      console.error('MCP実行エラー:', mcpError);
      return NextResponse.json({ 
        success: false, 
        message: `トリガーの適用に失敗しました: ${mcpError instanceof Error ? mcpError.message : '不明なエラー'}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('トリガー適用中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `トリガー適用エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}
