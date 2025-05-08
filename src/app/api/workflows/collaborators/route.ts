import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');
  
  if (!workflowId) {
    return NextResponse.json({ error: 'ワークフローIDが指定されていません' }, { status: 400 });
  }
  
  const client = supabase();
  
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = supabase();
  
  // ユーザー情報を取得
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
  
  // 必須パラメータのチェック
  if (!body.workflowId || !body.userId) {
    return NextResponse.json({ error: 'ワークフローIDとユーザーIDは必須です' }, { status: 400 });
  }
  
  // 既に共同編集者として登録されているか確認
  const { data: existingCollaborator, error: checkError } = await client
    .from('workflow_collaborators')
    .select('id')
    .eq('workflow_id', body.workflowId)
    .eq('user_id', body.userId)
    .maybeSingle();
    
  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 400 });
  }
  
  // 既に登録されている場合は更新
  if (existingCollaborator && existingCollaborator.id) {
    const { data, error } = await client
      .from('workflow_collaborators')
      .update({
        permission_type: body.permissionType || 'edit',
        added_by: user.id
      })
      .eq('id', existingCollaborator.id)
      .select();
      
    if (error) {
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
      added_by: user.id
    })
    .select();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json(data[0]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
  }
  
  const client = supabase();
  
  // ユーザー情報を取得
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
  
  const { error } = await client
    .from('workflow_collaborators')
    .delete()
    .eq('id', id);
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ success: true });
}
