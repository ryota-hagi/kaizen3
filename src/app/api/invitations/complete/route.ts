import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, userData, userId } = await req.json();
    
    // バリデーション
    if (!token || !userData || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: '必須パラメータが不足しています' 
      }, { status: 400 });
    }
    
    // サービスロールキーを使用してRLSをバイパス
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // 招待情報を取得（tokenまたはinvite_tokenで検索）
    const { data, error: getError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .or(`token.eq.${token},invite_token.eq.${token}`)
      .single();
    
    if (getError || !data) {
      console.error('[Supabase] Error getting invitation data:', getError);
      return NextResponse.json({ 
        success: false, 
        message: '招待情報の取得に失敗しました',
        error: getError?.message
      }, { status: 500 });
    }
    
    // app_usersテーブルにユーザー情報を保存
    const { error: userError } = await supabaseAdmin
      .from('app_users')
      .upsert({
        id: userId,
        auth_uid: userId,
        email: data.email,
        full_name: userData.fullName,
        company_id: userData.companyId || data.company_id,
        role: data.role || '一般ユーザー',
        status: 'アクティブ',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        invited_by: data.invited_by,
        invitation_accepted_at: new Date().toISOString()
      }, { onConflict: 'auth_uid' });
    
    if (userError) {
      console.error('[Supabase] Error saving user to database:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'ユーザー情報の保存に失敗しました',
        error: userError.message
      }, { status: 500 });
    }
    
    // invitationsテーブルから該当レコードを削除
    const { error: deleteError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .or(`token.eq.${token},invite_token.eq.${token}`);
    
    if (deleteError) {
      console.error('[Supabase] Error deleting invitation:', deleteError);
      // 削除に失敗しても処理は続行する（ユーザー登録は完了しているため）
      console.log('招待の削除に失敗しましたが、ユーザー登録は完了しています');
    } else {
      console.log('招待を正常に削除しました');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '招待が完了しました',
      userData: {
        id: userId,
        email: data.email,
        fullName: userData.fullName,
        role: data.role || '一般ユーザー',
        companyId: userData.companyId || data.company_id
      }
    });
  } catch (error) {
    console.error('[Supabase] Exception completing invitation:', error);
    return NextResponse.json({ 
      success: false, 
      message: '招待完了処理中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
