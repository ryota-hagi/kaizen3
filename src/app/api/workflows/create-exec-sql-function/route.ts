import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    // 管理者権限を持つSupabaseクライアントを取得
    const adminClient = supabaseAdmin();
    
    // exec_sql関数を作成するSQL
    const createExecSqlFunctionSQL = `
      -- exec_sql関数を作成
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
      BEGIN
        -- SQLクエリを実行し、結果をJSONBとして返す
        EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
        RETURN COALESCE(result, '[]'::JSONB);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE EXCEPTION 'SQL実行エラー: %', SQLERRM;
      END;
      $$;
    `;
    
    // get_workflow_collaborators関数を作成するSQL
    const createGetWorkflowCollaboratorsSQL = `
      -- get_workflow_collaborators関数を作成
      CREATE OR REPLACE FUNCTION get_workflow_collaborators(workflow_id_param UUID)
      RETURNS SETOF workflow_collaborators
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT *
        FROM workflow_collaborators
        WHERE workflow_id = workflow_id_param;
      END;
      $$;
    `;
    
    // add_workflow_collaborator関数を作成するSQL
    const createAddWorkflowCollaboratorSQL = `
      -- add_workflow_collaborator関数を作成
      CREATE OR REPLACE FUNCTION add_workflow_collaborator(
        workflow_id_param UUID,
        user_id_param UUID,
        permission_type_param TEXT,
        added_by_param UUID
      )
      RETURNS SETOF workflow_collaborators
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        user_full_name TEXT;
        collaborator_id UUID;
      BEGIN
        -- ユーザーのfull_nameを取得
        SELECT full_name INTO user_full_name
        FROM app_users
        WHERE id = user_id_param;

        -- ユーザーが存在しない場合は作成
        IF user_full_name IS NULL THEN
          INSERT INTO app_users (id, auth_uid, email, full_name, role, status)
          VALUES (user_id_param, user_id_param, '', user_id_param::TEXT, '一般ユーザー', 'アクティブ')
          ON CONFLICT (id) DO NOTHING
          RETURNING full_name INTO user_full_name;
        END IF;

        -- 共同編集者を追加または更新
        INSERT INTO workflow_collaborators (workflow_id, user_id, permission_type, full_name, added_by)
        VALUES (workflow_id_param, user_id_param, permission_type_param, COALESCE(user_full_name, user_id_param::TEXT), added_by_param)
        ON CONFLICT (workflow_id, user_id)
        DO UPDATE SET
          permission_type = permission_type_param,
          full_name = COALESCE(user_full_name, user_id_param::TEXT),
          added_by = added_by_param
        RETURNING id INTO collaborator_id;

        -- 追加または更新された共同編集者を返す
        RETURN QUERY
        SELECT *
        FROM workflow_collaborators
        WHERE id = collaborator_id;
      END;
      $$;
    `;
    
    // remove_workflow_collaborator関数を作成するSQL
    const createRemoveWorkflowCollaboratorSQL = `
      -- remove_workflow_collaborator関数を作成
      CREATE OR REPLACE FUNCTION remove_workflow_collaborator(collaborator_id_param UUID)
      RETURNS SETOF workflow_collaborators
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        DELETE FROM workflow_collaborators
        WHERE id = collaborator_id_param
        RETURNING *;
      END;
      $$;
    `;
    
    // 各関数を順番に作成
    console.log('exec_sql関数を作成中...');
    try {
      // exec_sql関数を作成
      await adminClient.rpc('exec_sql', { 
        sql_query: createExecSqlFunctionSQL 
      });
      console.log('exec_sql関数が正常に作成されました');
    } catch (err) {
      console.log('exec_sql関数が存在しないため、直接SQLを実行します');
      try {
        // 直接SQLを実行
        await adminClient.rpc('exec_sql_direct', { 
          sql_query: createExecSqlFunctionSQL 
        });
      } catch (directErr) {
        console.log('直接SQLの実行にも失敗しました。別の方法を試みます');
        try {
          // 別の方法でSQLを実行
          const { data, error } = await adminClient.from('_dummy_table_for_sql_execution')
            .select('*')
            .limit(1)
            .single();
          
          if (error && error.code === 'PGRST116') {
            // テーブルが存在しない場合は、別の方法でSQLを実行
            console.log('別の方法でSQLを実行します');
            
            // Supabase MCPを使用してSQLを実行
            const response = await fetch('/api/workflows/supabase-mcp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                operation: 'execute_sql',
                params: {
                  sql: createExecSqlFunctionSQL
                }
              }),
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Supabase MCPを使用したSQL実行結果:', result);
          }
        } catch (finalErr) {
          console.error('すべての方法でSQLの実行に失敗しました:', finalErr);
          return NextResponse.json({ 
            error: `すべての方法でSQLの実行に失敗しました: ${finalErr instanceof Error ? finalErr.message : '不明なエラー'}` 
          }, { status: 500 });
        }
      }
    }
    
    // 残りの関数を作成
    console.log('get_workflow_collaborators関数を作成中...');
    try {
      // get_workflow_collaborators関数を作成
      const response1 = await fetch('/api/workflows/supabase-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'execute_sql',
          params: {
            sql: createGetWorkflowCollaboratorsSQL
          }
        }),
      });
      
      if (!response1.ok) {
        throw new Error(`API error: ${response1.status}`);
      }
      
      const result1 = await response1.json();
      console.log('get_workflow_collaborators関数が正常に作成されました:', result1);
    } catch (err) {
      console.error('get_workflow_collaborators関数の作成に失敗しました:', err);
      return NextResponse.json({ 
        error: `get_workflow_collaborators関数の作成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}` 
      }, { status: 500 });
    }
    
    console.log('add_workflow_collaborator関数を作成中...');
    try {
      // add_workflow_collaborator関数を作成
      const response2 = await fetch('/api/workflows/supabase-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'execute_sql',
          params: {
            sql: createAddWorkflowCollaboratorSQL
          }
        }),
      });
      
      if (!response2.ok) {
        throw new Error(`API error: ${response2.status}`);
      }
      
      const result2 = await response2.json();
      console.log('add_workflow_collaborator関数が正常に作成されました:', result2);
    } catch (err) {
      console.error('add_workflow_collaborator関数の作成に失敗しました:', err);
      return NextResponse.json({ 
        error: `add_workflow_collaborator関数の作成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}` 
      }, { status: 500 });
    }
    
    console.log('remove_workflow_collaborator関数を作成中...');
    try {
      // remove_workflow_collaborator関数を作成
      const response3 = await fetch('/api/workflows/supabase-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'execute_sql',
          params: {
            sql: createRemoveWorkflowCollaboratorSQL
          }
        }),
      });
      
      if (!response3.ok) {
        throw new Error(`API error: ${response3.status}`);
      }
      
      const result3 = await response3.json();
      console.log('remove_workflow_collaborator関数が正常に作成されました:', result3);
    } catch (err) {
      console.error('remove_workflow_collaborator関数の作成に失敗しました:', err);
      return NextResponse.json({ 
        error: `remove_workflow_collaborator関数の作成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'すべての関数が正常に作成されました' 
    });
  } catch (error) {
    console.error('関数作成中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `関数作成中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
