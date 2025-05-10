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
    
    // 認証情報がない場合でも処理を続行（RLSをバイパス）
    let accessToken = null;
    
    if (user) {
      // ユーザーのJWTトークンを取得
      const { data: { session } } = await supabaseClient.auth.getSession();
      accessToken = session?.access_token;
      console.log('認証済みユーザー:', user.id);
    } else {
      console.log('未認証ユーザー: RLSをバイパスして処理を続行します');
    }
    
    let result;
    
    switch (operation) {
      case 'execute_sql':
        try {
          const { sql } = params;
          
          if (!sql) {
            return NextResponse.json({ error: 'SQLクエリが指定されていません' }, { status: 400 });
          }
          
          console.log('実行するSQL:', sql);
          
          // SQLを実行
          const { data, error } = await supabaseClient.rpc('exec_sql', { sql_query: sql });
          
          if (error) {
            console.error('SQL実行エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          
          result = { success: true, message: 'SQLが正常に実行されました', data };
        } catch (error) {
          console.error('SQL実行中にエラーが発生しました:', error);
          return NextResponse.json({ 
            error: `SQL実行エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
          }, { status: 500 });
        }
        break;
        
      case 'get_workflows':
        try {
          // 認証情報がある場合は直接Supabaseクライアントを使用
          if (user) {
            console.log('認証情報を使用してワークフローを取得します');
            
            // ユーザー情報を取得
            const { data: userData, error: userError } = await supabaseClient
              .from('app_users')
              .select('company_id, role')
              .eq('auth_uid', user.id)
              .single();
              
            if (userError) {
              console.error('ユーザー情報取得エラー:', userError);
              return NextResponse.json({ 
                error: `ユーザー情報取得エラー: ${userError.message}` 
              }, { status: 500 });
            }
            
            if (!userData) {
              console.error('ユーザー情報が見つかりません');
              return NextResponse.json({ 
                error: 'ユーザー情報が見つかりません' 
              }, { status: 404 });
            }
            
            console.log('ユーザー情報:', userData);
            
            // 管理者の場合は会社IDでフィルタリング
            if (userData.role === 'admin' && userData.company_id) {
              console.log('管理者として会社IDに基づいてワークフローを取得:', userData.company_id);
              
              // 管理者権限でSupabaseクライアントを作成
              const { supabaseAdmin } = await import('@/lib/supabaseClient');
              const adminClient = supabaseAdmin();
              
              // 管理者権限でワークフローを取得（会社IDでフィルタリング）
              // company_idが一致するものだけを取得
              const adminCompanyId = userData.company_id as string;
              const { data: adminWorkflows, error: adminError } = await adminClient
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
                .eq('company_id', adminCompanyId)
                .order('updated_at', { ascending: false });
                
              if (adminError) {
                console.error('管理者権限でのワークフロー取得エラー:', adminError);
                return NextResponse.json({ 
                  error: `管理者権限でのワークフロー取得エラー: ${adminError.message}` 
                }, { status: 500 });
              }
              
              console.log(`管理者権限で取得したワークフロー数: ${adminWorkflows ? adminWorkflows.length : 0}`);
              result = adminWorkflows || [];
            } else {
              // 管理者以外もユーザーの会社IDに基づいてワークフローを取得
              console.log('ユーザーの会社IDに基づいてワークフローを取得:', userData.company_id);
              const companyId = userData.company_id as string;
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
                  ),
                  creator:app_users!created_by(id, full_name)
                `)
                .eq('company_id', companyId)
                .order('updated_at', { ascending: false });
                
              if (workflowsError) {
                console.error('ワークフロー取得エラー:', workflowsError);
                return NextResponse.json({ 
                  error: `ワークフロー取得エラー: ${workflowsError.message}` 
                }, { status: 500 });
              }
              
              console.log(`取得したワークフロー数: ${workflows ? workflows.length : 0}`);
              result = workflows || [];
            }
            
          } else {
            // 認証情報がない場合はRLSを無効化してデータを取得
            console.log('RLSを無効化してデータを取得します');
            
            // 管理者権限でSupabaseクライアントを作成
            const { supabaseAdmin } = await import('@/lib/supabaseClient');
            const adminClient = supabaseAdmin();
            
            // 管理者権限でワークフローを取得
            let query = adminClient
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
              `);
              
            // 会社IDが指定されている場合はフィルタリング
            const companyId = params.company_id as string | undefined;
            if (companyId) {
              // 会社IDでフィルタリング
              const { data: adminWorkflows, error: adminError } = await query
                .eq('company_id', companyId)
                .order('updated_at', { ascending: false });
                
              if (adminError) {
                console.error('管理者権限でのワークフロー取得エラー:', adminError);
                return NextResponse.json({ 
                  error: `管理者権限でのワークフロー取得エラー: ${adminError.message}` 
                }, { status: 500 });
              }
              
              console.log(`管理者権限で取得したワークフロー数: ${adminWorkflows ? adminWorkflows.length : 0}`);
              result = adminWorkflows || [];
            } else {
              // 会社IDが指定されていない場合は全て取得してからフィルタリング
              const { data: adminWorkflows, error: adminError } = await query
                .order('updated_at', { ascending: false });
                
              if (adminError) {
                console.error('管理者権限でのワークフロー取得エラー:', adminError);
                return NextResponse.json({ 
                  error: `管理者権限でのワークフロー取得エラー: ${adminError.message}` 
                }, { status: 500 });
              }
              
              // 取得したワークフローの中から、company_idがnullでないものだけをフィルタリング
              if (adminWorkflows) {
                const filteredWorkflows = adminWorkflows.filter(workflow => workflow.company_id !== null);
                console.log(`全ワークフロー数: ${adminWorkflows.length}, フィルタリング後のワークフロー数: ${filteredWorkflows.length}`);
                result = filteredWorkflows;
              } else {
                result = [];
              }
            }
          }
        } catch (error) {
          console.error('ワークフロー取得中にエラーが発生しました:', error);
          return NextResponse.json({ 
            error: `ワークフロー取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
          }, { status: 500 });
        }
        break;
        
      case 'get_workflow_collaborators':
        try {
          const { workflowId } = params;
          
          if (!workflowId) {
            return NextResponse.json({ error: 'ワークフローIDが指定されていません' }, { status: 400 });
          }
          
          // RLSを無効化してワークフロー共同編集者を取得
          // 直接SQLを実行してRLSをバイパス
          const { data: collaborators, error } = await supabaseClient.rpc('get_workflow_collaborators', {
            workflow_id_param: workflowId
          });
          
          if (error) {
            console.error('共同編集者取得エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          
          // ユーザー情報を別途取得
          const userIds = (collaborators as any[]).map(collab => collab.user_id);
          let userData: any[] = [];
          
          if (userIds.length > 0) {
            const { data: users, error: userError } = await supabaseClient
              .from('app_users')
              .select('*')
              .in('id', userIds);
              
            if (!userError && users) {
              userData = users;
            } else {
              console.error('ユーザー情報取得エラー:', userError);
            }
          }
          
          // データを整形して返す
          const formattedData = (collaborators as any[]).map(collab => {
            const user = userData.find(u => u.id === collab.user_id);
            return {
              id: collab.id,
              workflowId: collab.workflow_id,
              userId: collab.user_id,
              permissionType: collab.permission_type,
              addedAt: collab.added_at,
              addedBy: collab.added_by,
              user: user || null
            };
          });
          
          result = formattedData;
        } catch (error) {
          console.error('共同編集者取得中にエラーが発生しました:', error);
          return NextResponse.json({ 
            error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
          }, { status: 500 });
        }
        break;
        
      case 'add_workflow_collaborator':
        try {
          const { workflowId, userId, permissionType } = params;
          
          if (!workflowId || !userId) {
            return NextResponse.json({ error: 'ワークフローIDとユーザーIDは必須です' }, { status: 400 });
          }
          
          // システムユーザーID（認証されていない場合）
          const systemUserId = '00000000-0000-0000-0000-000000000000';
          const addedBy = user?.id || systemUserId;
          
          // RLSを無効化して共同編集者を追加
          const { data: collaboratorData, error } = await supabaseClient.rpc('add_workflow_collaborator', {
            workflow_id_param: workflowId,
            user_id_param: userId,
            permission_type_param: permissionType || 'edit',
            added_by_param: addedBy
          });
          
          if (error) {
            console.error('共同編集者追加エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          
          result = collaboratorData;
        } catch (error) {
          console.error('共同編集者追加中にエラーが発生しました:', error);
          return NextResponse.json({ 
            error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
          }, { status: 500 });
        }
        break;
        
      case 'remove_workflow_collaborator':
        try {
          const { id } = params;
          
          if (!id) {
            return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
          }
          
          // RLSを無効化して共同編集者を削除
          const { data: removedData, error } = await supabaseClient.rpc('remove_workflow_collaborator', {
            collaborator_id_param: id
          });
          
          if (error) {
            console.error('共同編集者削除エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          
          result = {
            success: true,
            message: '共同編集者を削除しました',
            id: id,
            data: removedData
          };
        } catch (error) {
          console.error('共同編集者削除中にエラーが発生しました:', error);
          return NextResponse.json({ 
            error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
          }, { status: 500 });
        }
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
    console.error('Supabase操作エラー:', error);
    return NextResponse.json({ 
      error: `Supabase操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
