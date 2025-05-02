import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { INVITATIONS_TABLE, INVITE_STATUS_ACCEPTED } from '@/constants/invitations';

export async function POST(req: Request) {
  try {
    // サーバーサイドでサービスロールキーを使用してSupabaseクライアントを作成
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // 環境変数の確認
    if (!url || !serviceKey) {
      console.error('[API] Supabase env vars are not set');
      return NextResponse.json(
        { success: false, error: 'Supabase env vars are not set' },
        { status: 500 },
      );
    }

    // サービスロールキーを使用したクライアントの作成
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });
    
    // テーブル名をログに出力
    console.log(`[API] Using table name: ${INVITATIONS_TABLE}`);

    // リクエストボディの取得
    const { token, userData } = await req.json();
    console.log('[API] Received complete invitation data:', { token, userData });
    
    // 必須フィールドの確認
    if (!token || !userData || !userData.email) {
      console.error('[API] Missing required fields in complete invitation data');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }
    
    // 同じメールアドレスの古い招待を削除（トークンが異なるもの）
    try {
      const deleteResult = await supabaseAdmin
        .from(INVITATIONS_TABLE)
        .delete()
        .eq('email', userData.email)
        .neq('invite_token', token);
      
      // 結果をログに出力
      console.log('► invitations.delete result', { error: deleteResult.error });
      
      if (deleteResult.error) {
        console.error('[API] Error deleting old invitations:', deleteResult.error);
      } else {
        console.log('[API] Deleted old invitations for email:', userData.email);
      }
    } catch (deleteError) {
      console.error('[API] Exception deleting old invitations:', deleteError);
      // 削除エラーは無視して続行
    }
    
    // 招待を完了する
    const updateData = { 
      status: INVITE_STATUS_ACCEPTED,
      updated_at: new Date().toISOString(),
      email: userData.email // 実際のユーザーのメールアドレスで更新
    };
    
    console.log(`[API] Updating invitation with token ${token}:`, updateData);
    
    const { data, error } = await supabaseAdmin
      .from(INVITATIONS_TABLE)
      .update(updateData)
      .eq('invite_token', token)
      .select()
      .maybeSingle();
    
    // 結果をログに出力（成功・失敗に関わらず）
    console.log('► invitations.update result', { data, error });
    
    // エラーハンドリング
    if (error) {
      let errorMessage = error.message;
      let errorType = 'unknown';
      
      // エラーの種類を特定
      if (error.code === '42501') {
        errorType = 'rls_policy';
        errorMessage = 'RLSポリシーによって拒否されました。一時的にRLSを無効化するか、適切なポリシーを設定してください。';
      } else if (error.code === '42P01') {
        errorType = 'relation_not_exist';
        errorMessage = `テーブル "${INVITATIONS_TABLE}" が存在しません。`;
      } else if (error.message && error.message.includes('violates not-null constraint')) {
        errorType = 'not_null_constraint';
        errorMessage = '必須フィールドが不足しています。' + error.message;
      }
      
      console.error(`[API] Error completing invitation (${errorType}):`, error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: error,
          errorType: errorType,
          errorMessage: errorMessage,
          updateData: updateData // デバッグ用に送信データも返す
        },
        { status: 500 },
      );
    }
    
    // データが見つからない場合
    if (!data) {
      console.log('[API] No invitation found with token:', token);
      return NextResponse.json(
        { 
          success: false, 
          error: '招待が見つかりませんでした',
          token: token
        },
        { status: 404 },
      );
    }
    
    // 成功レスポンス
    console.log('[API] Successfully completed invitation:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    // 例外ハンドリング
    console.error('[API] Exception in complete invitation API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error
      },
      { status: 500 },
    );
  }
}
