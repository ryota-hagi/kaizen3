import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    // サービスロールキーが設定されているかどうかを確認
    const adminClient = supabaseAdmin();
    
    // 環境変数の確認（値は表示しない）
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    const hasUrl = !!url;
    const hasServiceRoleKey = !!serviceRoleKey;
    
    // 簡単なテストとして、ユーザー一覧を取得
    const { data, error } = await adminClient.auth.admin.listUsers();
    
    if (error) {
      console.error('Supabase Admin API呼び出しエラー:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        hasUrl,
        hasServiceRoleKey
      }, { status: 500 });
    }
    
    // 成功した場合は、ユーザー数のみを返す（セキュリティのため）
    return NextResponse.json({ 
      success: true, 
      userCount: data.users.length,
      hasUrl,
      hasServiceRoleKey
    });
  } catch (error) {
    console.error('Supabase Admin APIテストエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, email, fullName, companyId, role } = body;
    
    // アクションに応じて処理を分岐
    if (action === 'create_user') {
      const adminClient = supabaseAdmin();
      
      // app_usersテーブルにユーザー情報を保存
      const { data, error } = await adminClient
        .from('app_users')
        .upsert({
          id: userId,
          auth_uid: userId,
          email: email,
          full_name: fullName,
          company_id: companyId,
          role: role || '一般ユーザー',
          status: 'アクティブ',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }, { onConflict: 'auth_uid' })
        .select();
      
      if (error) {
        console.error('ユーザー情報の保存エラー:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        data
      });
    }
    
    // サポートされていないアクション
    return NextResponse.json({ 
      success: false, 
      error: 'サポートされていないアクションです'
    }, { status: 400 });
  } catch (error) {
    console.error('Supabase Admin API POSTエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: `予期せぬエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}
