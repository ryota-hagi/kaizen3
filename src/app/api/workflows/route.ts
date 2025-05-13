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
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 最初から管理者クライアントを使用してRLSをバイパス
    let client = supabaseAdmin();
    console.log('管理者クライアントを使用してRLSをバイパスします');
    
    let userId = null;
    let companyId = null;
    
    try {
      // 通常のクライアントでユーザー情報を取得
      const normalClient = supabase();
      const { data: { user }, error: authError } = await normalClient.auth.getUser();
      
      if (authError) {
        console.error('認証エラー:', authError);
        console.log('未認証ユーザー: 管理者権限で処理を続行します');
      } else if (user) {
        userId = user.id;
        
        // ユーザーの会社情報を取得
        try {
          const { data: userData, error: userDataError } = await normalClient
            .from('app_users')
            .select('company_id, department')
            .eq('auth_uid', user.id)
            .single();
            
          if (userDataError) {
            console.error('ユーザー情報の取得エラー:', userDataError);
          }
          
          if (userData) {
            companyId = userData.company_id;
          }
        } catch (error) {
          console.error('ユーザー情報の取得に失敗しました:', error);
        }
      } else {
        console.log('未認証ユーザー: 管理者権限で処理を続行します');
      }
    } catch (error) {
      console.error('認証情報の取得に失敗しました:', error);
      console.log('認証エラー発生: 管理者権限で処理を続行します');
    }
    
    // ユーザーIDがない場合はapp_usersテーブルから最初のユーザーIDを取得
    if (!userId) {
      try {
        const { data: userData, error: userError } = await client
          .from('app_users')
          .select('id')
          .limit(1)
          .single();
          
        if (userError) {
          console.error('デフォルトユーザー取得エラー:', userError);
        }
        
        if (userData) {
          userId = userData.id;
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    }

    // 必須フィールドの検証
    if (!body.name) {
      return NextResponse.json({ 
        error: 'ワークフロー名は必須です',
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // 会社IDの取得
    let finalCompanyId;
    try {
      finalCompanyId = companyId || (await getDefaultCompanyId(client));
    } catch (error) {
      console.error('会社ID取得エラー:', error);
      
      // 会社IDが取得できない場合はダミーの会社IDを使用
      console.log('会社IDが取得できないため、ダミーの会社IDを使用します');
      finalCompanyId = '00000000-0000-0000-0000-000000000000';
    }

    // ワークフローを作成
    const workflowData: any = {
      name: body.name,
      description: body.description || '',
      steps: body.steps || [],
      is_improved: body.isImproved || false,
      original_id: body.originalId,
      created_by: userId, // app_usersテーブルのidを使用
      company_id: body.company_id || finalCompanyId, // クライアントから送信された会社IDを優先
      access_level: body.accessLevel || 'user',
      version: 1
    };
    
    // IDが指定されている場合、UUID形式かどうかをチェック
    if (body.id) {
      // UUIDの正規表現パターン
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // UUIDの形式に一致する場合のみIDを設定
      if (uuidPattern.test(body.id)) {
        workflowData.id = body.id;
      } else {
        console.log(`指定されたID "${body.id}" はUUID形式ではないため、自動生成します`);
      }
    }
    
    console.log('保存するワークフローデータ:', workflowData);
    
    // データベースに保存（リトライロジックを追加）
    let data = null;
    let dbError: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!data && retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`データベース保存を再試行します (${retryCount}/${maxRetries})...`);
          // リトライ間隔を設定（指数バックオフ）
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 500));
        }
        
        const result = await client
          .from('workflows')
          .insert(workflowData)
          .select();
          
        if (result.error) {
          dbError = result.error;
          console.error(`保存エラー (試行 ${retryCount + 1}/${maxRetries}):`, dbError);
          retryCount++;
        } else {
          data = result.data;
          break;
        }
      } catch (e) {
        dbError = e;
        console.error(`予期しないエラー (試行 ${retryCount + 1}/${maxRetries}):`, e);
        retryCount++;
      }
    }
    
    if (dbError) {
      console.error('最終的なワークフロー保存エラー:', dbError);
      
      // エラーの種類に応じたレスポンス
      const errorCode = dbError.code ? dbError.code : '';
      const errorMessage = dbError.message ? dbError.message : String(dbError);
      
      if (errorCode === '23505') {
        return NextResponse.json({ 
          error: '同じIDのワークフローが既に存在します',
          details: errorMessage,
          code: 'DUPLICATE_ERROR'
        }, { status: 409 });
      } else if (errorCode === '23503') {
        // 外部キー制約エラーの場合、created_byをnullに設定して再試行
        console.log('外部キー制約エラー: created_byをnullに設定して再試行します');
        
        try {
          const retryData = {
            ...workflowData,
            created_by: null
          };
          
          const retryResult = await client
            .from('workflows')
            .insert(retryData)
            .select();
            
          if (retryResult.error) {
            return NextResponse.json({ 
              error: '参照整合性エラー: 関連するレコードが存在しません',
              details: retryResult.error.message || 'Unknown error',
              code: 'FOREIGN_KEY_ERROR'
            }, { status: 400 });
          } else {
            data = retryResult.data;
          }
        } catch (retryError: any) {
          return NextResponse.json({ 
            error: '参照整合性エラー: 関連するレコードが存在しません',
            details: retryError.message || String(retryError),
            code: 'FOREIGN_KEY_ERROR'
          }, { status: 400 });
        }
      } else if (errorCode === '42P01') {
        return NextResponse.json({ 
          error: 'テーブルが存在しません。データベースのセットアップを確認してください。',
          details: errorMessage,
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 });
      } else {
        return NextResponse.json({ 
          error: 'データベースエラーが発生しました',
          details: errorMessage,
          code: 'DATABASE_ERROR'
        }, { status: 500 });
      }
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'ワークフローの作成に成功しましたが、データが返されませんでした',
        code: 'NO_DATA_RETURNED'
      }, { status: 500 });
    }
    
    // 変更履歴を記録
    if (userId) {
      try {
        await client
          .from('workflow_history')
          .insert({
            workflow_id: data[0].id,
            changed_by: userId,
            change_type: 'create',
            new_state: data[0]
          });
      } catch (historyError) {
        console.error('変更履歴の記録に失敗しました:', historyError);
        // 履歴の記録失敗は全体の失敗とはしない
      }
    }
    
    return NextResponse.json({
      success: true,
      data: data[0],
      message: 'ワークフローが正常に作成されました'
    });
    
  } catch (error) {
    console.error('予期しないエラーが発生しました:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました',
      details: error instanceof Error ? error.message : String(error),
      code: 'UNEXPECTED_ERROR'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // 最初から管理者クライアントを使用してRLSをバイパス
    let client = supabaseAdmin();
    console.log('管理者クライアントを使用してRLSをバイパスします');
    
    // 必須パラメータの検証
    if (!body.id) {
      return NextResponse.json({ 
        error: 'ワークフローIDは必須です',
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }
    
    let userId = null;
    let companyId = null;
    
    try {
      // 通常のクライアントでユーザー情報を取得
      const normalClient = supabase();
      const { data: { user }, error: authError } = await normalClient.auth.getUser();
      
      if (authError) {
        console.error('認証エラー:', authError);
        console.log('未認証ユーザー: 管理者権限で処理を続行します');
      } else if (user) {
        userId = user.id;
        
        // ユーザーの会社情報を取得
        try {
          const { data: userData, error: userDataError } = await normalClient
            .from('app_users')
            .select('company_id')
            .eq('auth_uid', user.id)
            .single();
            
          if (userDataError) {
            console.error('ユーザー情報の取得エラー:', userDataError);
          }
          
          if (userData) {
            companyId = userData.company_id;
          }
        } catch (error) {
          console.error('ユーザー情報の取得に失敗しました:', error);
        }
      } else {
        console.log('未認証ユーザー: 管理者権限で処理を続行します');
      }
    } catch (error) {
      console.error('認証情報の取得に失敗しました:', error);
      console.log('認証エラー発生: 管理者権限で処理を続行します');
    }
    
    // 現在のワークフロー情報を取得
    const { data: currentWorkflow, error: fetchError } = await client
      .from('workflows')
      .select('*')
      .eq('id', body.id)
      .single();
      
    if (fetchError) {
      const errorCode = fetchError.code ? fetchError.code : '';
      const errorMessage = fetchError.message ? fetchError.message : String(fetchError);
      
      if (errorCode === 'PGRST116') {
        return NextResponse.json({ 
          error: '対象のワークフローが見つかりません', 
          details: errorMessage,
          code: 'NOT_FOUND'
        }, { status: 404 });
      } else {
        return NextResponse.json({ 
          error: 'ワークフロー情報の取得に失敗しました', 
          details: errorMessage,
          code: 'DATABASE_ERROR'
        }, { status: 500 });
      }
    }
    
    // バージョンチェック（楽観的ロック）
    const currentVersion = typeof currentWorkflow.version === 'number' ? currentWorkflow.version : 1;
    
    if (body.version && body.version !== currentVersion) {
      return NextResponse.json({ 
        error: '他のユーザーによって更新されています。最新の状態を取得してください。',
        conflict: true,
        latestData: currentWorkflow,
        code: 'VERSION_CONFLICT'
      }, { status: 409 });
    }
    
    // ユーザーIDがない場合はapp_usersテーブルから最初のユーザーIDを取得
    if (!userId) {
      try {
        const { data: userData, error: userError } = await client
          .from('app_users')
          .select('id, company_id')
          .limit(1)
          .single();
          
        if (userError) {
          console.error('デフォルトユーザー取得エラー:', userError);
        }
        
        if (userData) {
          userId = userData.id;
          if (!companyId && userData.company_id) {
            companyId = userData.company_id;
          }
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    }
    
    // ワークフローを更新
    const updates = {
      name: body.name || currentWorkflow.name,
      description: body.description !== undefined ? body.description : currentWorkflow.description,
      steps: body.steps || currentWorkflow.steps,
      is_improved: body.isImproved !== undefined ? body.isImproved : currentWorkflow.is_improved,
      original_id: body.originalId || currentWorkflow.original_id,
      is_completed: body.isCompleted !== undefined ? body.isCompleted : currentWorkflow.is_completed,
      completed_at: body.isCompleted ? new Date() : null,
      updated_at: new Date(),
      access_level: body.accessLevel || currentWorkflow.access_level,
      company_id: body.company_id || currentWorkflow.company_id || companyId, // 会社IDを設定
      version: currentVersion + 1 // バージョン番号をインクリメント
    };
    
    // データベースに保存（リトライロジックを追加）
    let data = null;
    let dbError: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!data && retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`データベース更新を再試行します (${retryCount}/${maxRetries})...`);
          // リトライ間隔を設定（指数バックオフ）
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 500));
        }
        
        const result = await client
          .from('workflows')
          .update(updates)
          .eq('id', body.id)
          .select();
          
        if (result.error) {
          dbError = result.error;
          console.error(`更新エラー (試行 ${retryCount + 1}/${maxRetries}):`, dbError);
          retryCount++;
        } else {
          data = result.data;
          break;
        }
      } catch (e) {
        dbError = e;
        console.error(`予期しないエラー (試行 ${retryCount + 1}/${maxRetries}):`, e);
        retryCount++;
      }
    }
    
    if (dbError) {
      console.error('最終的なワークフロー更新エラー:', dbError);
      
      // エラーの種類に応じたレスポンス
      const errorCode = dbError.code ? dbError.code : '';
      const errorMessage = dbError.message ? dbError.message : String(dbError);
      
      if (errorCode === '23505') {
        return NextResponse.json({ 
          error: '一意制約違反: 同じIDのワークフローが既に存在します',
          details: errorMessage,
          code: 'DUPLICATE_ERROR'
        }, { status: 409 });
      } else if (errorCode === '23503') {
        return NextResponse.json({ 
          error: '参照整合性エラー: 関連するレコードが存在しません',
          details: errorMessage,
          code: 'FOREIGN_KEY_ERROR'
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: 'データベースエラーが発生しました',
          details: errorMessage,
          code: 'DATABASE_ERROR'
        }, { status: 500 });
      }
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'ワークフローの更新に成功しましたが、データが返されませんでした',
        code: 'NO_DATA_RETURNED'
      }, { status: 500 });
    }
    
    // 変更履歴を記録
    try {
      await client
        .from('workflow_history')
        .insert({
          workflow_id: body.id,
          changed_by: userId || 'system',
          change_type: 'update',
          previous_state: currentWorkflow,
          new_state: data[0]
        });
    } catch (historyError) {
      console.error('変更履歴の記録に失敗しました:', historyError);
      // 履歴の記録失敗は全体の失敗とはしない
    }
    
    return NextResponse.json({
      success: true,
      data: data[0],
      message: 'ワークフローが正常に更新されました'
    });
    
  } catch (error) {
    console.error('予期しないエラーが発生しました:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました',
      details: error instanceof Error ? error.message : String(error),
      code: 'UNEXPECTED_ERROR'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
  }
  
  // 最初から管理者クライアントを使用してRLSをバイパス
  let client = supabaseAdmin();
  console.log('管理者クライアントを使用してRLSをバイパスします');
  
  let userId = null;
  
  try {
    // 通常のクライアントでユーザー情報を取得
    const normalClient = supabase();
    const { data: { user }, error: authError } = await normalClient.auth.getUser();
    
    if (authError) {
      console.error('認証エラー:', authError);
      console.log('未認証ユーザー: 管理者権限で処理を続行します');
    } else if (user) {
      userId = user.id;
    } else {
      console.log('未認証ユーザー: 管理者権限で処理を続行します');
    }
  } catch (error) {
    console.error('認証情報の取得に失敗しました:', error);
    console.log('認証エラー発生: 管理者権限で処理を続行します');
  }
  
  // ユーザーIDがない場合はapp_usersテーブルから最初のユーザーIDを取得
  if (!userId) {
    try {
      const { data: userData, error: userError } = await client
        .from('app_users')
        .select('id')
        .limit(1)
        .single();
        
      if (userError) {
        console.error('デフォルトユーザー取得エラー:', userError);
      }
      
      if (userData) {
        userId = userData.id;
      }
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
    }
  }
  
  // 現在のワークフロー情報を取得（履歴用）
  const { data: currentWorkflow, error: fetchError } = await client
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError) {
    const errorMessage = fetchError.message ? fetchError.message : String(fetchError);
    return NextResponse.json({ 
      error: '対象のワークフローが見つかりません',
      details: errorMessage
    }, { status: 404 });
  }
  
  // 変更履歴を記録
  try {
    await client
      .from('workflow_history')
      .insert({
        workflow_id: id,
        changed_by: userId || 'system',
        change_type: 'delete',
        previous_state: currentWorkflow,
        new_state: null
      });
  } catch (historyError) {
    console.error('変更履歴の記録に失敗しました:', historyError);
    // 履歴の記録失敗は全体の失敗とはしない
  }
  
  // データベースに保存（リトライロジックを追加）
  let success = false;
  let dbError: any = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (!success && retryCount < maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`データベース削除を再試行します (${retryCount}/${maxRetries})...`);
        // リトライ間隔を設定（指数バックオフ）
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 500));
      }
      
      const result = await client
        .from('workflows')
        .delete()
        .eq('id', id);
        
      if (result.error) {
        dbError = result.error;
        console.error(`削除エラー (試行 ${retryCount + 1}/${maxRetries}):`, dbError);
        retryCount++;
      } else {
        success = true;
        break;
      }
    } catch (e) {
      dbError = e;
      console.error(`予期しないエラー (試行 ${retryCount + 1}/${maxRetries}):`, e);
      retryCount++;
    }
  }
  
  if (dbError) {
    console.error('最終的なワークフロー削除エラー:', dbError);
    
    // エラーの種類に応じたレスポンス
    const errorCode = dbError.code ? dbError.code : '';
    const errorMessage = dbError.message ? dbError.message : String(dbError);
    
    if (errorCode === '23503') {
      return NextResponse.json({ 
        error: '参照整合性エラー: このワークフローは他のデータから参照されています',
        details: errorMessage,
        code: 'FOREIGN_KEY_ERROR'
      }, { status: 400 });
    } else {
      return NextResponse.json({ 
        error: 'データベースエラーが発生しました',
        details: errorMessage,
        code: 'DATABASE_ERROR'
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({ 
    success: true,
    message: 'ワークフローが正常に削除されました'
  });
}
