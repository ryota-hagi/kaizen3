import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(request: Request) {
  const body = await request.json();
  const client = supabase();
  
  // ユーザー情報を取得
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
  
  // 必須パラメータのチェック
  if (!body.workflowId || !body.accessLevel) {
    return NextResponse.json({ error: 'ワークフローIDとアクセスレベルは必須です' }, { status: 400 });
  }
  
  // アクセスレベルの検証
  if (!['user', 'department', 'company'].includes(body.accessLevel)) {
    return NextResponse.json({ error: 'アクセスレベルは user, department, company のいずれかである必要があります' }, { status: 400 });
  }
  
  // ユーザーの権限を確認
  const { data: userData, error: userError } = await client
    .from('app_users')
    .select('role, department, company_id')
    .eq('auth_uid', user.id)
    .single();
    
  if (userError) {
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 400 });
  }
  
  // ワークフロー情報を取得
  const { data: workflow, error: workflowError } = await client
    .from('workflows')
    .select('created_by, company_id, access_level')
    .eq('id', body.workflowId)
    .single();
    
  if (workflowError) {
    return NextResponse.json({ error: 'ワークフロー情報の取得に失敗しました' }, { status: 400 });
  }
  
  // 権限チェック
  const isCreator = workflow.created_by === user.id;
  const isAdmin = userData.role === 'admin';
  const isManager = userData.role === 'manager';
  const isSameCompany = workflow.company_id === userData.company_id;
  
  // 部署レベルの共有は、作成者自身、管理者、またはマネージャーのみ可能
  if (body.accessLevel === 'department' && !isCreator && !isAdmin && !isManager) {
    return NextResponse.json({ error: '部署レベルの共有には、マネージャー以上の権限が必要です' }, { status: 403 });
  }
  
  // 会社レベルの共有は、作成者自身または管理者のみ可能
  if (body.accessLevel === 'company' && !isCreator && !isAdmin) {
    return NextResponse.json({ error: '会社レベルの共有には、管理者権限が必要です' }, { status: 403 });
  }
  
  // 他社のワークフローは操作不可
  if (!isSameCompany) {
    return NextResponse.json({ error: '他社のワークフローは操作できません' }, { status: 403 });
  }
  
  // アクセスレベルを更新
  const { data, error } = await client
    .from('workflows')
    .update({
      access_level: body.accessLevel,
      updated_at: new Date()
    })
    .eq('id', body.workflowId)
    .select();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // 変更履歴を記録
  await client
    .from('workflow_history')
    .insert({
      workflow_id: body.workflowId,
      changed_by: user.id,
      change_type: 'update_access_level',
      previous_state: { access_level: workflow.access_level },
      new_state: { access_level: body.accessLevel }
    });
  
  return NextResponse.json(data[0]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');
  
  if (!workflowId) {
    return NextResponse.json({ error: 'ワークフローIDが指定されていません' }, { status: 400 });
  }
  
  const client = supabase();
  
  const { data, error } = await client
    .from('workflows')
    .select('access_level')
    .eq('id', workflowId)
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json(data);
}
