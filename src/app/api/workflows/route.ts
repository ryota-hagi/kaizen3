import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  const client = supabase();
  
  // 特定のワークフローを取得
  if (id) {
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data);
  }
  
  // 全てのワークフローを取得
  const { data, error } = await client
    .from('workflows')
    .select(`
      *,
      collaborators:workflow_collaborators(count)
    `)
    .order('updated_at', { ascending: false });
    
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
  
  // ユーザーの会社情報を取得
  const { data: userData, error: userError } = await client
    .from('app_users')
    .select('company_id, department')
    .eq('auth_uid', user.id)
    .single();
    
  if (userError) {
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 400 });
  }
  
  // ワークフローを作成
  const workflowData = {
    name: body.name,
    description: body.description,
    steps: body.steps || [],
    is_improved: body.isImproved || false,
    original_id: body.originalId,
    created_by: user.id,
    company_id: userData.company_id,
    access_level: body.accessLevel || 'user',
    version: 1
  };
  
  const { data, error } = await client
    .from('workflows')
    .insert(workflowData)
    .select();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // 変更履歴を記録
  await client
    .from('workflow_history')
    .insert({
      workflow_id: data[0].id,
      changed_by: user.id,
      change_type: 'create',
      new_state: data[0]
    });
  
  return NextResponse.json(data[0]);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const client = supabase();
  
  // ユーザー情報を取得
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
  
  // 現在のワークフロー情報を取得
  const { data: currentWorkflow, error: fetchError } = await client
    .from('workflows')
    .select('*')
    .eq('id', body.id)
    .single();
    
  if (fetchError) {
    return NextResponse.json({ error: '対象のワークフローが見つかりません' }, { status: 404 });
  }
  
  // バージョンチェック（楽観的ロック）
  const currentVersion = typeof currentWorkflow.version === 'number' ? currentWorkflow.version : 1;
  
  if (body.version && body.version !== currentVersion) {
    return NextResponse.json({ 
      error: '他のユーザーによって更新されています。最新の状態を取得してください。',
      conflict: true,
      latestData: currentWorkflow
    }, { status: 409 });
  }
  
  // ワークフローを更新
  const updates = {
    name: body.name,
    description: body.description,
    steps: body.steps,
    is_improved: body.isImproved,
    original_id: body.originalId,
    is_completed: body.isCompleted,
    completed_at: body.isCompleted ? new Date() : null,
    updated_at: new Date(),
    access_level: body.accessLevel,
    version: currentVersion + 1 // バージョン番号をインクリメント
  };
  
  const { data, error } = await client
    .from('workflows')
    .update(updates)
    .eq('id', body.id)
    .select();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // 変更履歴を記録
  await client
    .from('workflow_history')
    .insert({
      workflow_id: body.id,
      changed_by: user.id,
      change_type: 'update',
      previous_state: currentWorkflow,
      new_state: data[0]
    });
  
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
  
  // 現在のワークフロー情報を取得（履歴用）
  const { data: currentWorkflow, error: fetchError } = await client
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError) {
    return NextResponse.json({ error: '対象のワークフローが見つかりません' }, { status: 404 });
  }
  
  // 変更履歴を記録
  await client
    .from('workflow_history')
    .insert({
      workflow_id: id,
      changed_by: user.id,
      change_type: 'delete',
      previous_state: currentWorkflow,
      new_state: null
    });
  
  // ワークフローを削除
  const { error } = await client
    .from('workflows')
    .delete()
    .eq('id', id);
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ success: true });
}
