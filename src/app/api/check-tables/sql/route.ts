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
    
    // 直接SQLクエリを実行してテーブル一覧を取得
    const { data: tables, error: tablesError } = await supabaseAdmin.rpc(
      'exec_sql',
      {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `
      }
    );
    
    if (tablesError) {
      console.error('[API] Error executing SQL query for tables:', tablesError);
      
      // 代替方法：直接REST APIを使用
      const baseUrl = url;
      const apiUrl = `${baseUrl}/rest/v1/`;
      console.log(`[API] Direct API URL: ${apiUrl}`);
      
      try {
        const response = await fetch(`${apiUrl}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API] Error response from Supabase: ${response.status}`, errorText);
          return NextResponse.json(
            { success: false, error: `Supabase API error: ${response.status}` },
            { status: 500 },
          );
        }
        
        const data = await response.json();
        return NextResponse.json({ success: true, endpoints: data });
      } catch (fetchError) {
        console.error('[API] Exception in direct Supabase API call:', fetchError);
        return NextResponse.json(
          { success: false, error: 'Error calling Supabase API directly' },
          { status: 500 },
        );
      }
    }
    
    // user_invitationsテーブルが存在するか確認
    const { data: userInvitationsExists, error: userInvitationsError } = await supabaseAdmin.rpc(
      'exec_sql',
      {
        query: `
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_invitations'
          ) as exists
        `
      }
    );
    
    // invitationsテーブルが存在するか確認
    const { data: invitationsExists, error: invitationsError } = await supabaseAdmin.rpc(
      'exec_sql',
      {
        query: `
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'invitations'
          ) as exists
        `
      }
    );
    
    return NextResponse.json({ 
      success: true, 
      tables, 
      userInvitationsExists,
      userInvitationsError: userInvitationsError ? userInvitationsError.message : null,
      invitationsExists,
      invitationsError: invitationsError ? invitationsError.message : null
    });
  } catch (error) {
    console.error('[API] Exception in check-tables/sql API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
