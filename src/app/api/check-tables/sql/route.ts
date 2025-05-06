import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ビルド時にエラーが発生しないようにするための対策
// Next.jsのビルド時に実行されないようにする
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // edgeランタイムを使用

export async function GET(req: Request) {
  // ビルド時に実行されないようにするためのチェック
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API] Skipping API call during build time');
    return NextResponse.json({ success: true, message: 'Skipped during build' });
  }

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
    
    // 結果を格納するオブジェクト
    const result: any = {
      success: true,
      tables: {},
      errors: {}
    };
    
    // pg_tablesビューを使用してテーブル一覧を取得
    try {
      const { data: tablesData, error: tablesError } = await supabaseAdmin
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .order('tablename');
      
      if (tablesError) {
        console.error('[API] Error getting tables from pg_tables:', tablesError);
        result.errors.tables = tablesError.message;
      } else {
        result.tables = tablesData;
      }
    } catch (error: any) {
      console.error('[API] Exception getting tables:', error);
      result.errors.tables = error.message;
    }
    
    // user_invitationsテーブルが存在するか確認
    try {
      const { count: userInvitationsCount, error: userInvitationsError } = await supabaseAdmin
        .from('user_invitations')
        .select('*', { count: 'exact', head: true });
      
      result.user_invitations = {
        exists: !userInvitationsError,
        error: userInvitationsError ? userInvitationsError.message : null,
        count: userInvitationsCount || 0
      };
    } catch (error: any) {
      result.errors.user_invitations = error.message;
    }
    
    // invitationsテーブルが存在するか確認
    try {
      const { count: invitationsCount, error: invitationsError } = await supabaseAdmin
        .from('invitations')
        .select('*', { count: 'exact', head: true });
      
      result.invitations = {
        exists: !invitationsError,
        error: invitationsError ? invitationsError.message : null,
        count: invitationsCount || 0
      };
    } catch (error: any) {
      result.errors.invitations = error.message;
    }
    
    // 代替方法：直接REST APIを使用
    if (Object.keys(result.errors).length > 0) {
      const baseUrl = url;
      const apiUrl = `${baseUrl}/rest/v1/`;
      console.log(`[API] Direct API URL: ${apiUrl}`);
      
      try {
        const response = await fetch(`${apiUrl}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API] Error response from Supabase: ${response.status}`, errorText);
          result.direct_api = {
            success: false,
            error: `Supabase API error: ${response.status}`
          };
        } else {
          const data = await response.json();
          result.direct_api = {
            success: true,
            endpoints: data
          };
        }
      } catch (fetchError: any) {
        console.error('[API] Exception in direct Supabase API call:', fetchError);
        result.direct_api = {
          success: false,
          error: fetchError.message
        };
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Exception in check-tables/sql API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
