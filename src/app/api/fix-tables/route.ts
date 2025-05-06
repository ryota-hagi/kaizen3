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
    
    // リクエストボディを取得
    const body = await req.json();
    
    // SQLクエリが指定されている場合は、それを実行
    if (body.sql) {
      console.log('[API] Custom SQL execution is not supported in this environment');
      console.log('[API] Please use the Supabase dashboard to execute SQL queries');
      console.log('[API] SQL query:', body.sql);
      
      return NextResponse.json({
        success: false,
        message: 'Custom SQL execution is not supported in this environment. Please use the Supabase dashboard to execute SQL queries.',
        sql: body.sql
      });
    }
    
    // 通常のテーブル修正処理
    const result: any = {
      success: true,
      actions: [],
      errors: []
    };
    
    // 1. user_invitationsテーブルが存在するか確認
    try {
      const { count: userInvitationsCount, error: userInvitationsError } = await supabaseAdmin
        .from('user_invitations')
        .select('*', { count: 'exact', head: true });
      
      if (userInvitationsError) {
        result.errors.push({
          step: 'check_user_invitations',
          error: userInvitationsError.message
        });
        
        return NextResponse.json(result);
      }
      
      result.actions.push({
        step: 'check_user_invitations',
        result: `user_invitationsテーブルが存在し、${userInvitationsCount || 0}件のデータがあります`
      });
    } catch (error: any) {
      result.errors.push({
        step: 'check_user_invitations',
        error: error.message
      });
      
      return NextResponse.json(result);
    }
    
    // 2. invitationsテーブルが存在するか確認
    try {
      const { count: invitationsCount, error: invitationsError } = await supabaseAdmin
        .from('invitations')
        .select('*', { count: 'exact', head: true });
      
      if (!invitationsError) {
        result.actions.push({
          step: 'check_invitations',
          result: `invitationsテーブルが存在し、${invitationsCount || 0}件のデータがあります`
        });
      } else {
        // invitationsテーブルが存在しない場合は作成
        result.actions.push({
          step: 'check_invitations',
          result: 'invitationsテーブルが存在しないため、作成します'
        });
        
        // 3. invitationsテーブルを作成
        try {
          // テーブル作成のSQLを提供
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS invitations (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              email TEXT NOT NULL,
              role TEXT NOT NULL,
              company_id TEXT,
              invite_token TEXT NOT NULL UNIQUE,
              status TEXT NOT NULL DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- 検索を高速化するためのインデックスを追加
            CREATE INDEX IF NOT EXISTS idx_invite_token ON invitations(invite_token);
          `;
          
          console.log('[API] Cannot create table via API. Please use the Supabase dashboard to run:');
          console.log(createTableSQL);
          
          result.actions.push({
            step: 'create_invitations_table',
            result: 'テーブル作成のSQLを生成しました。Supabaseダッシュボードで実行してください。',
            sql: createTableSQL
          });
          
          return NextResponse.json(result);
        } catch (error: any) {
          result.errors.push({
            step: 'create_invitations_table',
            error: error.message
          });
          
          return NextResponse.json(result);
        }
      }
    } catch (error: any) {
      result.errors.push({
        step: 'check_invitations',
        error: error.message
      });
      
      return NextResponse.json(result);
    }
    
    // 4. user_invitationsテーブルのデータをinvitationsテーブルに移行
    try {
      // user_invitationsテーブルのデータを取得
      const { data: userInvitationsData, error: getUserInvitationsError } = await supabaseAdmin
        .from('user_invitations')
        .select('*');
      
      if (getUserInvitationsError) {
        result.errors.push({
          step: 'get_user_invitations_data',
          error: getUserInvitationsError.message
        });
        
        return NextResponse.json(result);
      }
      
      if (!userInvitationsData || userInvitationsData.length === 0) {
        result.actions.push({
          step: 'migrate_data',
          result: 'user_invitationsテーブルにデータがないため、移行は不要です'
        });
      } else {
        // データを移行
        let migratedCount = 0;
        let errors = [];
        
        for (const invitation of userInvitationsData) {
          // invitationsテーブルに挿入
          const { error: insertError } = await supabaseAdmin
            .from('invitations')
            .insert({
              email: invitation.email,
              role: invitation.role,
              company_id: invitation.company_id || '',
              invite_token: invitation.invite_token,
              status: invitation.status,
              created_at: invitation.created_at,
              updated_at: invitation.updated_at
            });
          
          if (insertError) {
            errors.push({
              email: invitation.email,
              error: insertError.message
            });
          } else {
            migratedCount++;
          }
        }
        
        result.actions.push({
          step: 'migrate_data',
          result: `${migratedCount}件のデータを移行しました`,
          errors: errors
        });
      }
    } catch (error: any) {
      result.errors.push({
        step: 'migrate_data',
        error: error.message
      });
      
      return NextResponse.json(result);
    }
    
    // 5. user_invitationsテーブルをリネーム
    try {
      // テーブルリネームのSQLを提供
      const renameTableSQL = `ALTER TABLE user_invitations RENAME TO user_invitations_backup;`;
      
      console.log('[API] Cannot rename table via API. Please use the Supabase dashboard to run:');
      console.log(renameTableSQL);
      
      result.actions.push({
        step: 'rename_table',
        result: 'テーブルリネームのSQLを生成しました。Supabaseダッシュボードで実行してください。',
        sql: renameTableSQL
      });
    } catch (error: any) {
      result.errors.push({
        step: 'rename_table',
        error: error.message
      });
      
      return NextResponse.json(result);
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] Exception in fix-tables API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 },
    );
  }
}
