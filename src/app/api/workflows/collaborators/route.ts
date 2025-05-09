import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');
  
  if (!workflowId) {
    return NextResponse.json({ error: 'ワークフローIDが指定されていません' }, { status: 400 });
  }
  
  try {
    const client = supabase();
    
    // ワークフローの存在確認
    const { data: workflow, error: workflowError } = await client
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .single();
      
    if (workflowError) {
      console.error('ワークフロー取得エラー:', workflowError);
      return NextResponse.json({ 
        error: `ワークフローが見つかりません: ${workflowError.message}` 
      }, { status: 404 });
    }
    
    // 共同編集者の取得
    const { data, error } = await client
      .from('workflow_collaborators')
      .select(`
        id,
        workflow_id,
        user_id,
        permission_type,
        added_at,
        added_by,
        user:user_id(
          id,
          email,
          full_name,
          role,
          department
        )
      `)
      .eq('workflow_id', workflowId);
      
    if (error) {
      console.error('共同編集者取得エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // データを整形して返す
    const formattedData = data.map(collab => ({
      id: collab.id,
      workflowId: collab.workflow_id,
      userId: collab.user_id,
      permissionType: collab.permission_type,
      addedAt: collab.added_at,
      addedBy: collab.added_by,
      user: collab.user
    }));
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('共同編集者取得中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = supabase();
    
    // 必須パラメータのチェック
    if (!body.workflowId || !body.userId) {
      return NextResponse.json({ error: 'ワークフローIDとユーザーIDは必須です' }, { status: 400 });
    }
    
    // ユーザー情報を取得
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id || 'system'; // 認証されていない場合はシステムとして扱う
    
    // ワークフローの存在確認
    const { data: workflow, error: workflowError } = await client
      .from('workflows')
      .select('id')
      .eq('id', body.workflowId)
      .single();
      
    if (workflowError) {
      console.error('ワークフロー取得エラー:', workflowError);
      return NextResponse.json({ 
        error: `ワークフローが見つかりません: ${workflowError.message}` 
      }, { status: 404 });
    }
    
    // 既に共同編集者として登録されているか確認
    const { data: existingCollaborator, error: checkError } = await client
      .from('workflow_collaborators')
      .select('id')
      .eq('workflow_id', body.workflowId)
      .eq('user_id', body.userId)
      .maybeSingle();
      
    if (checkError) {
      console.error('共同編集者確認エラー:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 400 });
    }
    
    // 既に登録されている場合は更新
    if (existingCollaborator && existingCollaborator.id) {
      const { data, error } = await client
        .from('workflow_collaborators')
        .update({
          permission_type: body.permissionType || 'edit',
          added_by: userId
        })
        .eq('id', existingCollaborator.id)
        .select();
        
      if (error) {
        console.error('共同編集者更新エラー:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json(data[0]);
    }
    
    // 新規登録
    const { data, error } = await client
      .from('workflow_collaborators')
      .insert({
        workflow_id: body.workflowId,
        user_id: body.userId,
        permission_type: body.permissionType || 'edit',
        added_by: userId
      })
      .select();
      
    if (error) {
      console.error('共同編集者追加エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('共同編集者追加中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
    }
    
    const client = supabase();
    
    // 共同編集者の存在確認
    const { data: collaborator, error: checkError } = await client
      .from('workflow_collaborators')
      .select('id, workflow_id')
      .eq('id', id)
      .single();
      
    if (checkError) {
      console.error('共同編集者確認エラー:', checkError);
      return NextResponse.json({ 
        error: `共同編集者が見つかりません: ${checkError.message}` 
      }, { status: 404 });
    }
    
    // 削除処理
    const { error } = await client
      .from('workflow_collaborators')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('共同編集者削除エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: '共同編集者を削除しました',
      id: id,
      workflowId: collaborator.workflow_id
    });
  } catch (error) {
    console.error('共同編集者削除中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
