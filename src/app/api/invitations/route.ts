import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { INVITATIONS_TABLE } from '@/constants/invitations';

// ビルド時にエラーが発生しないようにするための対策
// Next.jsのビルド時に実行されないようにする
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // edgeランタイムを使用

export async function POST(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ 
      success: true, 
      message: 'Skipped during build',
      data: null
    });
  }

  console.log('► [API] /api/invitations route reached');
  // ヘッダーを個別に表示
  console.log('► [API] Content-Type:', req.headers.get('content-type'));
  console.log('► [API] Origin:', req.headers.get('origin'));
  try {
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
    
    // 直接Supabaseの/rest/v1/invitationsエンドポイントにアクセスする
    const baseUrl = url;
    const apiUrl = `${baseUrl}/rest/v1/${INVITATIONS_TABLE}`;
    console.log(`[API] Direct API URL: ${apiUrl}`);
    
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
    
    try {
      // 直接RESTエンドポイントを使用
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Error response from Supabase: ${response.status}`, errorText);
        
        return NextResponse.json(
          { 
            success: false, 
            error: { message: `Supabase API error: ${response.status}`, details: errorText },
            errorType: 'api_error',
            errorMessage: `Supabase API error: ${response.status}`,
            insertData: insertData // デバッグ用に送信データも返す
          },
          { status: 500 },
        );
      }
      
      const data = await response.json();
      console.log('[API] Successfully inserted invitation via direct API:', data);
      return NextResponse.json({ success: true, data });
    } catch (fetchError) {
      console.error('[API] Exception in direct Supabase API call:', fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: fetchError,
          errorType: 'fetch_error',
          errorMessage: 'Error calling Supabase API directly',
          insertData: insertData // デバッグ用に送信データも返す
        },
        { status: 500 },
      );
    }
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
