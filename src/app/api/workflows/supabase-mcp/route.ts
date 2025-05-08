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
      case 'list_tables':
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'list_tables',
          arguments: {
            project_id: params.projectId
          }
        });
        break;
        
      case 'list_extensions':
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'list_extensions',
          arguments: {
            project_id: params.projectId
          }
        });
        break;
        
      case 'apply_migration':
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'apply_migration',
          arguments: {
            project_id: params.projectId,
            name: params.name,
            query: params.query
          }
        });
        break;
        
      case 'execute_sql':
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'execute_sql',
          arguments: {
            project_id: params.projectId,
            query: params.query
          }
        });
        break;
        
      case 'get_logs':
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'get_logs',
          arguments: {
            project_id: params.projectId,
            service: params.service
          }
        });
        break;
        
      case 'generate_typescript_types':
        result = await use_mcp_tool({
          server_name: 'github.com/supabase-community/supabase-mcp',
          tool_name: 'generate_typescript_types',
          arguments: {
            project_id: params.projectId
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
