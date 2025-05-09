import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // リクエストからプロジェクトIDを取得
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        message: 'プロジェクトIDが指定されていません' 
      }, { status: 400 });
    }
    
    // SQLファイルを読み込む
    const policiesSQL = fs.readFileSync(
      path.join(process.cwd(), 'src/db/migrations/update_workflows_rls_policies.sql'),
      'utf8'
    );
    
    // MCPを使用してSQLを実行
    try {
      // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
      const result = await global.use_mcp_tool(
        'github.com/supabase-community/supabase-mcp',
        'execute_sql',
        {
          project_id: projectId,
          query: policiesSQL
        }
      );
      
      return NextResponse.json({ 
        success: true, 
        message: '更新されたRLSポリシーを適用しました',
        result
      });
    } catch (mcpError) {
      console.error('MCP実行エラー:', mcpError);
      return NextResponse.json({ 
        success: false, 
        message: `RLSポリシーの適用に失敗しました: ${mcpError instanceof Error ? mcpError.message : '不明なエラー'}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('RLSポリシー適用エラー:', error);
    return NextResponse.json({ 
      success: false, 
      message: `RLSポリシーの適用に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
