import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, params } = body;
    
    if (!operation) {
      return NextResponse.json({ error: '操作タイプが指定されていません' }, { status: 400 });
    }
    
    // ユーザー認証情報を取得
    const supabaseClient = supabase();
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: '認証エラー: ユーザーが認証されていません' }, { status: 401 });
    }
    
    // ユーザーのJWTトークンを取得
    const { data: { session } } = await supabaseClient.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: '認証エラー: アクセストークンが取得できません' }, { status: 401 });
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
            query: params.query,
            auth_token: accessToken // JWTトークンを渡す
          }
        });
        break;
        
      case 'get_workflows':
        // ワークフロー一覧を取得
        // 直接Supabaseクライアントを使用してRLSを適切に処理
        const { data: workflows, error: workflowsError } = await supabaseClient
          .from('workflows')
          .select(`
            *,
            collaborators:workflow_collaborators(
              id,
              user_id,
              permission_type,
              added_at,
              added_by
            )
          `)
          .order('updated_at', { ascending: false });
          
        if (workflowsError) {
          console.error('ワークフロー取得エラー:', workflowsError);
          return NextResponse.json({ error: `ワークフロー取得エラー: ${workflowsError.message}` }, { status: 500 });
        }
        
        result = workflows;
        break;
        
      case 'update_workflow_completion':
        // ワークフローの完了状態を更新
        const { id, isCompleted } = params;
        const completedAt = isCompleted ? new Date().toISOString() : null;
        
        // 直接Supabaseクライアントを使用
        const { data: updatedWorkflow, error: updateError } = await supabaseClient
          .from('workflows')
          .update({
            is_completed: isCompleted,
            completed_at: completedAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
          
        if (updateError) {
          console.error('ワークフロー更新エラー:', updateError);
          return NextResponse.json({ error: `ワークフロー更新エラー: ${updateError.message}` }, { status: 500 });
        }
        
        result = updatedWorkflow;
        break;
        
      case 'delete_workflow':
        // ワークフローを削除
        const { data: deletedWorkflow, error: deleteError } = await supabaseClient
          .from('workflows')
          .delete()
          .eq('id', params.id)
          .select();
          
        if (deleteError) {
          console.error('ワークフロー削除エラー:', deleteError);
          return NextResponse.json({ error: `ワークフロー削除エラー: ${deleteError.message}` }, { status: 500 });
        }
        
        result = deletedWorkflow;
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
