import { supabase } from '../lib/supabaseClient';
import { Workflow } from '../utils/api';

/**
 * MCPツールを使用するためのヘルパー関数
 * @param serverName MCPサーバー名
 * @param toolName ツール名
 * @param args 引数
 * @returns ツールの実行結果
 */
async function useMcpTool(serverName: string, toolName: string, args: any) {
  // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
  return await global.use_mcp_tool(serverName, toolName, args);
}

/**
 * ローカルストレージのワークフローをSupabaseに移行する関数
 * @param projectId Supabaseプロジェクトのプロジェクトid
 * @returns 移行結果
 */
export const migrateWorkflowsToSupabase = async (projectId: string) => {
  try {
    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows');
    if (!storedWorkflows) {
      console.log('移行するワークフローがありません');
      return { success: true, message: '移行するワークフローがありません' };
    }
    
    const workflows = JSON.parse(storedWorkflows);
    const client = supabase();
    
    // 現在のユーザー情報を取得
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }
    
    // ユーザーの会社情報と部署情報を取得
    const { data: userData, error: userError } = await client
      .from('app_users')
      .select('company_id, department')
      .eq('auth_uid', user.id)
      .single();
      
    if (userError) {
      return { success: false, message: 'ユーザー情報の取得に失敗しました' };
    }
    
    // 各ワークフローをSupabaseに保存
    const results = await Promise.all(workflows.map(async (workflow: any) => {
      try {
        // 日付文字列をDateオブジェクトに変換
        const createdAt = workflow.createdAt ? new Date(workflow.createdAt as string) : new Date();
        const updatedAt = workflow.updatedAt ? new Date(workflow.updatedAt as string) : new Date();
        const completedAt = workflow.completedAt ? new Date(workflow.completedAt as string) : null;
        
        // ワークフローデータを整形
        const workflowData = {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          steps: workflow.steps,
          is_improved: workflow.isImproved || false,
          original_id: workflow.originalId,
          is_completed: workflow.isCompleted || false,
          completed_at: completedAt,
          created_at: createdAt,
          updated_at: updatedAt,
          created_by: workflow.createdBy || user.id,
          company_id: userData.company_id, // company_idはtext型
          access_level: 'user', // デフォルトはユーザーレベル
          is_public: false, // デフォルトは非公開
          version: 1
        };
        
        // MCPを使用してワークフローを保存
        try {
          // MCPツールを使用
          const result = await useMcpTool(
            'github.com/supabase-community/supabase-mcp',
            'execute_sql',
            {
              project_id: projectId,
              query: `
                INSERT INTO workflows (
                  id, name, description, steps, is_improved, original_id, 
                  is_completed, completed_at, created_at, updated_at, 
                  created_by, company_id, access_level, is_public, version
                ) VALUES (
                  '${workflowData.id}', 
                  '${workflowData.name.replace(/'/g, "''")}', 
                  '${(workflowData.description || '').replace(/'/g, "''")}', 
                  '${JSON.stringify(workflowData.steps).replace(/'/g, "''")}', 
                  ${workflowData.is_improved}, 
                  ${workflowData.original_id ? `'${workflowData.original_id}'` : 'NULL'}, 
                  ${workflowData.is_completed}, 
                  ${workflowData.completed_at ? `'${workflowData.completed_at.toISOString()}'` : 'NULL'}, 
                  '${workflowData.created_at.toISOString()}', 
                  '${workflowData.updated_at.toISOString()}', 
                  '${workflowData.created_by}', 
                  '${workflowData.company_id}', 
                  '${workflowData.access_level}', 
                  ${workflowData.is_public}, 
                  ${workflowData.version}
                )
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  steps = EXCLUDED.steps,
                  is_improved = EXCLUDED.is_improved,
                  original_id = EXCLUDED.original_id,
                  is_completed = EXCLUDED.is_completed,
                  completed_at = EXCLUDED.completed_at,
                  updated_at = EXCLUDED.updated_at,
                  access_level = EXCLUDED.access_level,
                  version = EXCLUDED.version
                RETURNING *;
              `
            }
          );
          
          // 履歴を記録
          await useMcpTool(
            'github.com/supabase-community/supabase-mcp',
            'execute_sql',
            {
              project_id: projectId,
              query: `
                INSERT INTO workflow_history (
                  workflow_id, changed_by, change_type, new_state
                ) VALUES (
                  '${workflow.id}',
                  '${user.id}',
                  'create',
                  '${JSON.stringify(workflowData).replace(/'/g, "''")}'
                );
              `
            }
          );
          
          return { id: workflow.id, success: true };
        } catch (mcpError) {
          console.error('MCP実行エラー:', mcpError);
          return { id: workflow.id, success: false, error: mcpError };
        }
      } catch (error) {
        console.error(`ワークフロー ${workflow.id} の処理中にエラーが発生しました:`, error);
        return { id: workflow.id, success: false, error };
      }
    }));
    
    // 結果の集計
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return { 
      success: failCount === 0,
      message: `${successCount}件のワークフローを移行しました。${failCount}件の失敗があります。`,
      results
    };
  } catch (error) {
    console.error('移行処理エラー:', error);
    return { success: false, message: '移行処理中にエラーが発生しました' };
  }
};

/**
 * Supabaseからワークフローを取得する関数
 * @returns ワークフロー一覧
 */
export const getWorkflowsFromSupabase = async () => {
  try {
    const client = supabase();
    
    const { data, error } = await client
      .from('workflows')
      .select(`
        *,
        collaborators:workflow_collaborators(count)
      `)
      .order('updated_at', { ascending: false });
      
    if (error) {
      console.error('ワークフローの取得エラー:', error);
      return { success: false, error };
    }
    
    // データを整形
    const workflows = data.map(wf => {
      // collaboratorsの型を安全に扱う
      const collaboratorCount = Array.isArray(wf.collaborators) && wf.collaborators.length > 0 
        ? (wf.collaborators[0] as any)?.count || 0 
        : 0;
        
      return {
        id: wf.id,
        name: wf.name,
        description: wf.description,
        steps: wf.steps,
        isImproved: wf.is_improved,
        originalId: wf.original_id,
        isCompleted: wf.is_completed,
        completedAt: wf.completed_at ? new Date(wf.completed_at as string) : undefined,
        createdAt: new Date(wf.created_at as string),
        updatedAt: new Date(wf.updated_at as string),
        createdBy: wf.created_by,
        companyId: wf.company_id,
        accessLevel: wf.access_level,
        version: wf.version,
        collaboratorCount
      };
    });
    
    return { success: true, data: workflows };
  } catch (error) {
    console.error('ワークフロー取得エラー:', error);
    return { success: false, error };
  }
};

/**
 * Supabaseからワークフローを取得する関数（ID指定）
 * @param id ワークフローID
 * @returns ワークフロー
 */
export const getWorkflowFromSupabase = async (id: string) => {
  try {
    const client = supabase();
    
    const { data, error } = await client
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
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('ワークフローの取得エラー:', error);
      return { success: false, error };
    }
    
    // データを整形
    const workflow = {
      id: data.id,
      name: data.name,
      description: data.description,
      steps: data.steps,
      isImproved: data.is_improved,
      originalId: data.original_id,
      isCompleted: data.is_completed,
      completedAt: data.completed_at ? new Date(data.completed_at as string) : undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      createdBy: data.created_by,
      companyId: data.company_id,
      accessLevel: data.access_level,
      version: data.version,
      collaborators: data.collaborators
    };
    
    return { success: true, data: workflow };
  } catch (error) {
    console.error('ワークフロー取得エラー:', error);
    return { success: false, error };
  }
};
