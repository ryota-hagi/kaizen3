import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');
  
  if (!workflowId) {
    return NextResponse.json({ error: 'ワークフローIDが指定されていません' }, { status: 400 });
  }
  
  try {
    const client = supabase();
    
    // 共同編集者の取得（外部キー関連付けを使用しない）
    const { data, error } = await client
      .from('workflow_collaborators')
      .select('*')
      .eq('workflow_id', workflowId);
      
    if (error) {
      console.error('共同編集者取得エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // 管理者権限を持つクライアントを使用してユーザー情報を別途取得
    const userIds = data.map(collab => collab.user_id);
    let userData: any[] = [];
    
    if (userIds.length > 0) {
      const adminClient = supabaseAdmin();
      const { data: users, error: userError } = await adminClient
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
    const formattedData = data.map(collab => {
      const user = userData.find(u => u.id === collab.user_id);
      
      // ユーザー名の取得（優先順位: collab.full_name > user.full_name）
      let displayName = "";
      
      if (collab.full_name && typeof collab.full_name === 'string') {
        displayName = collab.full_name;
      } else if (user?.full_name && typeof user.full_name === 'string') {
        displayName = user.full_name;
      } else {
        // ユーザー情報が取得できない場合は空文字列を返す
        displayName = "";
      }
      
      return {
        id: collab.id,
        workflowId: collab.workflow_id,
        userId: collab.user_id,
        permissionType: collab.permission_type,
        addedAt: collab.added_at,
        addedBy: collab.added_by,
        full_name: displayName,
        user: user || null
      };
    });
    
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
    // 認証されていない場合はNULLを使用
    const userId = user?.id || null;
    
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
    
    // app_usersテーブルから確実にユーザー情報を取得
    console.log('ユーザーID:', body.userId);
    
    // 管理者権限を持つクライアントを使用してapp_usersテーブルから直接full_nameを取得
    const adminClient = supabaseAdmin();
    let { data: userData, error: userError } = await adminClient
      .from('app_users')
      .select('full_name')
      .eq('id', body.userId)
      .single();
    
    console.log('app_usersテーブルからの取得結果:', userData);
    
    // ユーザー情報が取得できない場合はエラーを返す
    if (userError) {
      console.error('ユーザー情報取得エラー:', userError);
      
      // ユーザーが存在しない場合は、app_usersテーブルにユーザーを作成
      try {
        // 管理者権限を持つクライアントを使用してauthテーブルからユーザー情報を取得
        const adminClient = supabaseAdmin();
        const { data: authData } = await adminClient.auth.admin.getUserById(body.userId);
        
        // ユーザー情報を取得できた場合
        if (authData && authData.user) {
          // ユーザーのメールアドレスを取得
          const email = authData.user.email || '';
          
          // ユーザーのメタデータからfull_nameを取得
          let full_name = '';
          if (authData.user.user_metadata && authData.user.user_metadata.full_name) {
            full_name = authData.user.user_metadata.full_name;
          }
          
          try {
            // 管理者権限を持つクライアントを使用してapp_usersテーブルにユーザーを作成
            const adminClient = supabaseAdmin();
            const { data: newUser, error: insertError } = await adminClient
              .from('app_users')
              .insert({
                id: body.userId,
                auth_uid: body.userId,
                email: email,
                full_name: full_name,
                role: '一般ユーザー',
                status: 'アクティブ'
              })
              .select('full_name')
              .single();
            
            if (insertError) {
              console.error('ユーザー作成エラー:', insertError);
              // エラーが発生しても処理を続行
              console.log('ユーザー作成エラーが発生しましたが、処理を続行します');
            } else {
              // 作成したユーザーのfull_nameを使用
              userData = newUser;
            }
          } catch (insertErr) {
            console.error('ユーザー作成中に例外が発生:', insertErr);
            // 例外が発生しても処理を続行
            console.log('ユーザー作成中に例外が発生しましたが、処理を続行します');
          }
        } else {
          // ユーザー情報を取得できなかった場合でも処理を続行
          console.log('Auth APIからユーザー情報を取得できませんでしたが、処理を続行します');
          // 空のuserDataオブジェクトを作成
          userData = { full_name: body.userId };
        }
      } catch (error) {
        console.error('Auth API呼び出しエラー:', error);
        return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 });
      }
    }
    
    // full_nameを取得（userData.full_nameが存在しない場合は空文字列を使用）
    const userFullName = userData && userData.full_name ? userData.full_name : '';
    console.log('使用するユーザー名:', userFullName);
    
    // 既に登録されている場合は更新
    if (existingCollaborator && existingCollaborator.id) {
      // 更新データを準備
      const updateData: any = {
        permission_type: body.permissionType || 'edit',
        full_name: userFullName
      };
      
      // 認証されている場合のみadded_byを設定
      if (userId) {
        updateData.added_by = userId;
      }
      
      const { data, error } = await client
        .from('workflow_collaborators')
        .update(updateData)
        .eq('id', existingCollaborator.id)
        .select();
        
      if (error) {
        console.error('共同編集者更新エラー:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json(data[0]);
    }
    
    // 新規登録
    // 登録データを準備
    const insertData: any = {
      workflow_id: body.workflowId,
      user_id: body.userId,
      permission_type: body.permissionType || 'edit',
      full_name: userFullName
    };
    
    // 認証されている場合のみadded_byを設定
    if (userId) {
      insertData.added_by = userId;
    }
    
    const { data, error } = await client
      .from('workflow_collaborators')
      .insert(insertData)
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
    
    // 認証情報を取得
    const { data: { user } } = await client.auth.getUser();
    
    // 削除前に共同編集者情報を取得
    const { data: collaborator, error: getError } = await client
      .from('workflow_collaborators')
      .select('*')
      .eq('id', id)
      .single();
      
    if (getError) {
      console.error('共同編集者情報取得エラー:', getError);
      return NextResponse.json({ error: getError.message }, { status: 400 });
    }
    
    // 削除処理
    const { data, error } = await client
      .from('workflow_collaborators')
      .delete()
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('共同編集者削除エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: '共同編集者を削除しました',
      id: id,
      data: data
    });
  } catch (error) {
    console.error('共同編集者削除中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
