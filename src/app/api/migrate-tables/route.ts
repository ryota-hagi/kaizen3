import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { INVITATIONS_TABLE } from '@/constants/invitations';

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
    
    if (userInvitationsError) {
      console.error('[API] Error checking if user_invitations exists:', userInvitationsError);
      return NextResponse.json(
        { success: false, error: userInvitationsError },
        { status: 500 },
      );
    }
    
    // user_invitationsテーブルが存在しない場合
    if (!userInvitationsExists || !userInvitationsExists[0] || !userInvitationsExists[0].exists) {
      console.log('[API] user_invitations table does not exist, no migration needed');
      return NextResponse.json({ 
        success: true, 
        message: 'user_invitations table does not exist, no migration needed' 
      });
    }
    
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
    
    if (invitationsError) {
      console.error('[API] Error checking if invitations exists:', invitationsError);
      return NextResponse.json(
        { success: false, error: invitationsError },
        { status: 500 },
      );
    }
    
    // invitationsテーブルが存在しない場合、作成する
    if (!invitationsExists || !invitationsExists[0] || !invitationsExists[0].exists) {
      console.log('[API] invitations table does not exist, creating it');
      
      const { error: createTableError } = await supabaseAdmin.rpc(
        'exec_sql',
        {
          query: `
            CREATE TABLE invitations (
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
            
            -- 同じメールアドレスの古い招待を削除するための関数
            CREATE OR REPLACE FUNCTION clean_old_invitations()
            RETURNS TRIGGER AS $$
            BEGIN
              -- 同じメールアドレスの古い招待を削除（トークンが異なるもの）
              DELETE FROM invitations
              WHERE email = NEW.email
                AND invite_token <> NEW.invite_token
                AND status = 'pending';
              
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            -- トリガーの作成
            CREATE TRIGGER clean_old_invitations_trigger
            AFTER INSERT ON invitations
            FOR EACH ROW
            EXECUTE FUNCTION clean_old_invitations();
          `
        }
      );
      
      if (createTableError) {
        console.error('[API] Error creating invitations table:', createTableError);
        return NextResponse.json(
          { success: false, error: createTableError },
          { status: 500 },
        );
      }
      
      console.log('[API] Successfully created invitations table');
    }
    
    // user_invitationsテーブルからデータを取得
    const { data: userInvitations, error: getUserInvitationsError } = await supabaseAdmin.rpc(
      'exec_sql',
      {
        query: `
          SELECT * FROM user_invitations
        `
      }
    );
    
    if (getUserInvitationsError) {
      console.error('[API] Error getting data from user_invitations:', getUserInvitationsError);
      return NextResponse.json(
        { success: false, error: getUserInvitationsError },
        { status: 500 },
      );
    }
    
    if (!userInvitations || userInvitations.length === 0) {
      console.log('[API] No data in user_invitations table');
      return NextResponse.json({ 
        success: true, 
        message: 'No data in user_invitations table' 
      });
    }
    
    console.log(`[API] Found ${userInvitations.length} records in user_invitations table`);
    
    // データを移行
    let migratedCount = 0;
    let errors = [];
    
    for (const invitation of userInvitations) {
      // invitationsテーブルに挿入
      const { error: insertError } = await supabaseAdmin.rpc(
        'exec_sql',
        {
          query: `
            INSERT INTO invitations (
              email, 
              role, 
              company_id, 
              invite_token, 
              status, 
              created_at, 
              updated_at
            )
            VALUES (
              '${invitation.email}',
              '${invitation.role}',
              '${invitation.company_id || ''}',
              '${invitation.invite_token}',
              '${invitation.status}',
              '${invitation.created_at}',
              '${invitation.updated_at}'
            )
            ON CONFLICT (invite_token) DO NOTHING
          `
        }
      );
      
      if (insertError) {
        console.error(`[API] Error inserting invitation for ${invitation.email}:`, insertError);
        errors.push({
          email: invitation.email,
          error: insertError
        });
      } else {
        migratedCount++;
      }
    }
    
    console.log(`[API] Successfully migrated ${migratedCount} records`);
    
    // user_invitationsテーブルをリネーム
    if (migratedCount > 0) {
      const { error: renameError } = await supabaseAdmin.rpc(
        'exec_sql',
        {
          query: `
            ALTER TABLE user_invitations RENAME TO user_invitations_backup
          `
        }
      );
      
      if (renameError) {
        console.error('[API] Error renaming user_invitations table:', renameError);
        return NextResponse.json({ 
          success: true, 
          message: `Successfully migrated ${migratedCount} records, but failed to rename user_invitations table`,
          migratedCount,
          errors
        });
      }
      
      console.log('[API] Successfully renamed user_invitations table to user_invitations_backup');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully migrated ${migratedCount} records`,
      migratedCount,
      errors
    });
  } catch (error) {
    console.error('[API] Exception in migrate-tables API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
