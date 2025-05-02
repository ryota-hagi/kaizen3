import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { INVITATIONS_TABLE } from '@/constants/invitations';

export async function POST(req: Request) {
  console.log('► [API] /api/invitations route reached');
  // ヘッダーを個別に表示
  console.log('► [API] Content-Type:', req.headers.get('content-type'));
  console.log('► [API] Origin:', req.headers.get('origin'));
  try {
    // サーバーサイドでサービスロールキーを使用してSupabaseクライアントを作成
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log('► [API] SUPABASE_URL:', url ? 'set' : 'not set');
    console.log('► [API] SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? 'set' : 'not set');
    
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
    const invitation = await req.json();
    console.log('[API] Received invitation data:', invitation);
    
    // 必須フィールドの確認
    if (!invitation.email || !invitation.role || !invitation.invite_token) {
      console.error('[API] Missing required fields in invitation data');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }
    
    // 現在のタイムスタンプを追加
    const now = new Date().toISOString();
    
    // カラム名をスネークケースに変換（camelCaseで送られてきた場合の対応）
    const insertData = {
      email: invitation.email,
      role: invitation.role,
      company_id: invitation.company_id || invitation.companyId || '',
      invite_token: invitation.invite_token,
      status: invitation.status || 'pending',
      created_at: now,
      updated_at: now
    };
    
    // Supabaseにデータを挿入
    console.log(`[API] Inserting into table: ${INVITATIONS_TABLE}`, insertData);
    
    // Supabase v2クライアントでは{ returning: 'representation' }オプションが使用できないため、
    // 代わりに.select()を使用して同様の効果を得る
    const { data, error } = await supabaseAdmin
      .from(INVITATIONS_TABLE)
      .insert([insertData]) // 配列で渡す
      .select()
      .single();
    
    // 結果をログに出力（成功・失敗に関わらず）
    console.log('► invitations.insert result', { data, error });
    
    // エラーハンドリング - エラーがあれば即座にreturn
    if (error) {
      let errorMessage = error.message || 'Unknown error';
      let errorType = 'unknown';
      
      // エラーの種類を特定
      if (error.code === '42501') {
        errorType = 'rls_policy';
        errorMessage = 'RLSポリシーによって拒否されました。一時的にRLSを無効化するか、適切なポリシーを設定してください。';
      } else if (error.code === '22P02') {
        errorType = 'type_mismatch';
        errorMessage = '型の不一致があります。UUIDなどの型を確認してください。';
      } else if (error.code === '42703') {
        errorType = 'column_not_exist';
        errorMessage = 'カラム名が存在しません。カラム名がスネークケース（例：company_id）になっているか確認してください。';
      } else if (error.message && error.message.includes('violates not-null constraint')) {
        errorType = 'not_null_constraint';
        errorMessage = '必須フィールドが不足しています。' + error.message;
      } else if (error.message && error.message.includes('duplicate key')) {
        errorType = 'duplicate_key';
        errorMessage = '既に存在するデータです。' + error.message;
      }
      
      console.error(`[API] Error inserting invitation (${errorType}):`, error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: error,
          errorType: errorType,
          errorMessage: errorMessage,
          insertData: insertData // デバッグ用に送信データも返す
        },
        { status: 500 },
      );
    }
    
    // 成功レスポンス
    console.log('[API] Successfully inserted invitation:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    // 例外ハンドリング
    console.error('[API] Exception in invitation API:', error);
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
