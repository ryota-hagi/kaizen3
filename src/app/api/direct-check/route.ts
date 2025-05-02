import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
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
    
    // user_invitationsテーブルが存在するか確認
    try {
      const { count: userInvitationsCount, error: userInvitationsError } = await supabaseAdmin
        .from('user_invitations')
        .select('*', { count: 'exact', head: true });
      
      result.tables.user_invitations = {
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
      
      result.tables.invitations = {
        exists: !invitationsError,
        error: invitationsError ? invitationsError.message : null,
        count: invitationsCount || 0
      };
    } catch (error: any) {
      result.errors.invitations = error.message;
    }
    
    // 直接SQLクエリを実行してテーブル一覧を取得
    try {
      const { data: tablesData, error: tablesError } = await supabaseAdmin
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      result.pg_tables = {
        success: !tablesError,
        error: tablesError ? tablesError.message : null,
        data: tablesData
      };
    } catch (error: any) {
      result.errors.pg_tables = error.message;
    }
    
    // user_invitationsテーブルのデータを取得
    try {
      const { data: userInvitationsData, error: userInvitationsDataError } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .limit(10);
      
      result.user_invitations_data = {
        success: !userInvitationsDataError,
        error: userInvitationsDataError ? userInvitationsDataError.message : null,
        data: userInvitationsData
      };
    } catch (error: any) {
      result.errors.user_invitations_data = error.message;
    }
    
    // invitationsテーブルのデータを取得
    try {
      const { data: invitationsData, error: invitationsDataError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .limit(10);
      
      result.invitations_data = {
        success: !invitationsDataError,
        error: invitationsDataError ? invitationsDataError.message : null,
        data: invitationsData
      };
    } catch (error: any) {
      result.errors.invitations_data = error.message;
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Exception in direct-check API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
