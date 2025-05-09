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
