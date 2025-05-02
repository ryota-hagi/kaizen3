import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { INVITATIONS_TABLE, INVITATIONS_VIEW, INVITE_STATUS_PENDING } from '@/constants/invitations';

export async function POST(req: Request) {
  try {
    // サーバーサイドでサービスロールキーを使用してSupabaseクライアントを作成
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // 環境変数の確認
    if (!url || !serviceKey) {
      console.error('[API] Supabase env vars are not set');
      return NextResponse.json(
        { valid: false, error: 'Supabase env vars are not set' },
        { status: 500 },
      );
    }

    // サービスロールキーを使用したクライアントの作成
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // リクエストボディの取得
    const { token } = await req.json();
    console.log('[API] Received verify token request:', token);
    
    // 必須フィールドの確認
    if (!token) {
      console.error('[API] Missing token in verify request');
      return NextResponse.json(
        { valid: false, error: 'Missing token' },
        { status: 400 },
      );
    }
    
    // まずビューで検索を試みる
    let result;
    try {
      result = await supabaseAdmin
        .from(INVITATIONS_VIEW)
        .select('*')
        .eq('invite_token', token)
        .eq('status', INVITE_STATUS_PENDING)
        .maybeSingle();
      
      // 結果をログに出力（成功・失敗に関わらず）
      console.log('► invitations_view.select result', { data: result.data, error: result.error });
      
      // ビューでエラーが発生した場合、直接テーブルで検索
      if (result.error) {
        console.log('[API] Error with view, trying direct table:', result.error);
        result = await supabaseAdmin
          .from(INVITATIONS_TABLE)
          .select('*')
          .eq('invite_token', token)
          .eq('status', INVITE_STATUS_PENDING)
          .maybeSingle();
        
        // 結果をログに出力（成功・失敗に関わらず）
        console.log('► invitations.select result', { data: result.data, error: result.error });
      }
    } catch (error) {
      console.error('[API] Error querying Supabase:', error);
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Database query error',
          details: error
        },
        { status: 500 },
      );
    }
    
    // エラーハンドリング
    if (result.error) {
      let errorMessage = result.error.message;
      let errorType = 'unknown';
      
      // エラーの種類を特定
      if (result.error.code === '42501') {
        errorType = 'rls_policy';
        errorMessage = 'RLSポリシーによって拒否されました。一時的にRLSを無効化するか、適切なポリシーを設定してください。';
      } else if (result.error.code === '42P01') {
        errorType = 'relation_not_exist';
        errorMessage = `テーブルまたはビュー "${result.error.message && result.error.message.includes('invitations_v') ? INVITATIONS_VIEW : INVITATIONS_TABLE}" が存在しません。`;
      }
      
      console.error(`[API] Error verifying invite token (${errorType}):`, result.error);
      
      return NextResponse.json(
        { 
          valid: false, 
          error: result.error,
          errorType: errorType,
          errorMessage: errorMessage
        },
        { status: 400 },
      );
    }
    
    // データが見つからない場合
    if (!result.data) {
      console.log('[API] No invitation found with token:', token);
      return NextResponse.json({ valid: false });
    }
    
    // 成功レスポンス
    console.log('[API] Successfully verified invitation:', result.data);
    return NextResponse.json({ valid: true, invitation: result.data });
  } catch (error) {
    // 例外ハンドリング
    console.error('[API] Exception in verify invitation API:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal server error',
        details: error
      },
      { status: 500 },
    );
  }
}
