import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

// デフォルトの会社IDを取得する関数
async function getDefaultCompanyId(client: any) {
  // 会社テーブルから最初の会社を取得
  const { data, error } = await client
    .from('companies')
    .select('id')
    .limit(1)
    .single();
    
  if (error || !data) {
    console.error('デフォルト会社IDの取得に失敗しました:', error);
    throw new Error('会社情報が見つかりません。会社情報を先に登録してください。');
  }
  
  return data.id;
}

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
        ),
                creator:app_users!created_by(id, full_name)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data);
  }
  
  // ユーザー情報を取得して会社IDを取得
  let companyId = null;
  try {
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      // ユーザーの会社情報を取得
      const { data: userData } = await client
        .from('app_users')
        .select('company_id')
        .eq('auth_uid', user.id)
        .single();
        
      if (userData && userData.company_id) {
        companyId = userData.company_id;
      }
    }
  } catch (error) {
    console.error('ユーザー情報の取得に失敗しました:', error);
  }

  // 会社IDに基づいてワークフローを取得
  let query = client
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
    .order('updated_at', { ascending: false });
  
  // 会社IDが取得できた場合は、その会社のワークフローのみを取得
  // または会社IDがnullのワークフローも含める（サンプルワークフロー用）
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }
  
  const { data, error } = await query;
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  let client = supabase();
  
  let userId = null;
  let companyId = null;
  
  try {
    // ユーザー情報を取得
    const { data: { user } } = await client.auth.getUser();
    
    if (user) {
      userId = user.id;
      
      // ユーザーの会社情報を取得
      try {
        const { data: userData } = await client
          .from('app_users')
          .select('company_id, department')
          .eq('auth_uid', user.id)
          .single();
          
        if (userData) {
          companyId = userData.company_id;
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    } else {
      console.log('未認証ユーザー: RLSをバイパスして処理を続行します');
      
      // 管理者クライアントを使用してRLSをバイパス
      client = supabaseAdmin();
      console.log('RLSを無効化してデータを取得します');
    }
  } catch (error) {
    console.error('認証情報の取得に失敗しました:', error);
    // エラーが発生しても処理を続行
  }
  
  // ユーザーIDがない場合はapp_usersテーブルから最初のユーザーIDを取得
  if (!userId) {
    try {
      const { data: userData } = await client
        .from('app_users')
        .select('id')
        .limit(1)
        .single();
        
      if (userData) {
        userId = userData.id;
      }
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
    }
  }

  // ワークフローを作成
  const workflowData = {
    name: body.name,
    description: body.description,
    steps: body.steps || [],
    is_improved: body.isImproved || false,
    original_id: body.originalId,
    created_by: userId, // app_usersテーブルのidを使用
    company_id: companyId || (await getDefaultCompanyId(client)),
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
  if (userId) {
    await client
      .from('workflow_history')
      .insert({
        workflow_id: data[0].id,
        changed_by: userId,
        change_type: 'create',
        new_state: data[0]
      });
  }
  
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
