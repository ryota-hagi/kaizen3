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
        // 直接SQLを実行（本番環境ではサポートされていない）
        return NextResponse.json({ error: 'この操作は本番環境ではサポートされていません' }, { status: 400 });
        break;
        
      case 'get_workflows':
        try {
          // 認証状態に関わらずSupabaseクライアントを使用してワークフローを取得
          // RLSポリシーによってアクセス制御が行われる
          console.log('Supabaseクライアントを使用してワークフローを取得します');
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
            // テンプレートリテラルではなく文字列連結を使用
            throw new Error('ワークフロー取得エラー: ' + workflowsError.message);
          }
          
          result = workflows;
        } catch (error) {
          console.error('ワークフロー取得中にエラーが発生しました:', error);
          return NextResponse.json({ 
            // テンプレートリテラルではなく文字列連結を使用
            error: 'ワークフロー取得エラー: ' + (error instanceof Error ? error.message : '不明なエラー')
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
          // テンプレートリテラルではなく文字列連結を使用
          return NextResponse.json({ error: 'ワークフロー更新エラー: ' + updateError.message }, { status: 500 });
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
          // テンプレートリテラルではなく文字列連結を使用
          return NextResponse.json({ error: 'ワークフロー削除エラー: ' + deleteError.message }, { status: 500 });
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
      // テンプレートリテラルではなく文字列連結を使用
      error: 'Supabase操作に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー')
    }, { status: 500 });
  }
}
