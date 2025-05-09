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
    
    // 共同編集者の取得（外部キー関連付けを使用しない）
    const { data, error } = await client
      .from('workflow_collaborators')
      .select('*')
      .eq('workflow_id', workflowId);
      
    if (error) {
      console.error('共同編集者取得エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // ユーザー情報を別途取得
    const userIds = data.map(collab => collab.user_id);
    let userData: any[] = [];
    
    if (userIds.length > 0) {
      const { data: users, error: userError } = await client
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
      
      // ユーザー名の取得（優先順位: collab.full_name > user.full_name > user.username > user.email > ユーザーID）
      let displayName = "";
      
      if (collab.full_name && typeof collab.full_name === 'string') {
        displayName = collab.full_name;
      } else if (user?.full_name && typeof user.full_name === 'string') {
        displayName = user.full_name;
      } else if (user?.username && typeof user.username === 'string') {
        displayName = user.username;
      } else if (user?.email && typeof user.email === 'string') {
        displayName = user.email.split('@')[0];
      } else if (collab.user_id && typeof collab.user_id === 'string') {
        // ユーザーIDの最初の8文字を使用
        displayName = `ユーザー ${collab.user_id.substring(0, 8)}`;
      } else {
        // 最終的なフォールバック
        displayName = "ユーザー";
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
    
    // ユーザー情報を取得
    let userFullName = "";
    
    console.log('ユーザーID:', body.userId);
    
    // 1. まずapp_usersテーブルから直接ユーザー情報を取得
    const { data: userData, error: userError } = await client
      .from('app_users')
      .select('*')
      .eq('id', body.userId)
      .single();
      
    console.log('取得したユーザーデータ:', userData);
    console.log('ユーザー取得エラー:', userError);
    
    // 2. authテーブルからユーザー情報を取得
    let authUser = null;
    try {
      const { data: authData, error: authError } = await client.auth.admin.getUserById(body.userId);
      if (!authError && authData && authData.user) {
        authUser = authData.user;
        console.log('Auth APIからのユーザー情報:', authUser);
      } else {
        console.log('Auth APIからのユーザー取得エラー:', authError);
      }
    } catch (authFetchError) {
      console.error('Auth API呼び出しエラー:', authFetchError);
    }
    
    // 3. 直接メールアドレスでユーザーを検索
    let emailUser = null;
    if (authUser && authUser.email) {
      const { data: emailUserData, error: emailUserError } = await client
        .from('app_users')
        .select('*')
        .eq('email', authUser.email)
        .single();
        
      if (!emailUserError && emailUserData) {
        emailUser = emailUserData;
        console.log('メールアドレスで見つかったユーザー:', emailUser);
      }
    }
    
    // 4. 優先順位に従ってユーザー名を設定
    // app_usersテーブルのデータを優先
    if (!userError && userData) {
      if (userData.full_name && typeof userData.full_name === 'string') {
        userFullName = userData.full_name;
        console.log('app_usersテーブルからfull_nameを使用:', userFullName);
      } else if (userData.username && typeof userData.username === 'string') {
        userFullName = userData.username;
        console.log('app_usersテーブルからusernameを使用:', userFullName);
      } else if (userData.email && typeof userData.email === 'string') {
        userFullName = userData.email.split('@')[0];
        console.log('app_usersテーブルからemailを使用:', userFullName);
      }
    }
    // メールアドレスで見つかったユーザーデータを次に優先
    else if (emailUser) {
      if (emailUser.full_name && typeof emailUser.full_name === 'string') {
        userFullName = emailUser.full_name;
        console.log('メールアドレス検索からfull_nameを使用:', userFullName);
      } else if (emailUser.username && typeof emailUser.username === 'string') {
        userFullName = emailUser.username;
        console.log('メールアドレス検索からusernameを使用:', userFullName);
      }
    }
    // Auth APIのデータを最後に使用
    else if (authUser) {
      if (authUser.user_metadata && authUser.user_metadata.full_name) {
        userFullName = authUser.user_metadata.full_name;
        console.log('Auth APIからfull_nameを取得:', userFullName);
      } else if (authUser.email) {
        userFullName = authUser.email.split('@')[0];
        console.log('Auth APIからemailを取得:', userFullName);
      }
    }
    
    // 5. それでも名前が取得できなかった場合は、ユーザーIDの最初の8文字を使用
    if (!userFullName) {
      userFullName = `ユーザー ${body.userId.substring(0, 8)}`;
      console.log('ユーザーIDから名前を生成:', userFullName);
    }
    
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
