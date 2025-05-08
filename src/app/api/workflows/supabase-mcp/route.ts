import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, params } = body;
    
    if (!operation) {
      return NextResponse.json({ error: '操作タイプが指定されていません' }, { status: 400 });
    }
    
    let result;
    
    switch (operation) {
      case 'execute_sql':
        // MCPを使用してSupabaseにアクセス
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'execute_sql',
          arguments: {
            project_id: 'czuedairowlwfgbjmfbg',
            query: params.query
          }
        });
        break;
        
      case 'get_workflows':
        // ワークフロー一覧を取得
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'execute_sql',
          arguments: {
            project_id: 'czuedairowlwfgbjmfbg',
            query: `
              SELECT w.*,
                (
                  SELECT json_agg(c.*)
                  FROM workflow_collaborators c
                  WHERE c.workflow_id = w.id
                ) as collaborators
              FROM workflows w
              ORDER BY w.updated_at DESC
            `
          }
        });
        break;
        
      case 'update_workflow_completion':
        // ワークフローの完了状態を更新
        const { id, isCompleted } = params;
        const completedAt = isCompleted ? new Date().toISOString() : null;
        
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'execute_sql',
          arguments: {
            project_id: 'czuedairowlwfgbjmfbg',
            query: `
              UPDATE workflows 
              SET 
                is_completed = ${isCompleted}, 
                completed_at = ${isCompleted ? `'${completedAt}'` : 'NULL'},
                updated_at = NOW()
              WHERE id = '${id}'
              RETURNING *
            `
          }
        });
        break;
        
      case 'delete_workflow':
        // ワークフローを削除
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'execute_sql',
          arguments: {
            project_id: 'czuedairowlwfgbjmfbg',
            query: `DELETE FROM workflows WHERE id = '${params.id}' RETURNING id`
          }
        });
        break;
        
      default:
        return NextResponse.json({ error: '不明な操作タイプです' }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Supabase MCP操作エラー:', error);
    return NextResponse.json({ 
      error: `Supabase MCP操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}

// MCPツールを使用するためのヘルパー関数
async function use_mcp_tool({ server_name, tool_name, arguments: args }: {
  server_name: string;
  tool_name: string;
  arguments: any;
}) {
  // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
  return await global.use_mcp_tool(server_name, tool_name, args);
}
