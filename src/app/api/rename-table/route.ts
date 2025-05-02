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
    console.log(`[API] Target table name: ${INVITATIONS_TABLE}`);
    
    // user_invitationsテーブルが存在するか確認
    const { data: userInvitationsExists, error: userInvitationsError } = await supabaseAdmin
      .from('user_invitations')
      .select('count()', { count: 'exact', head: true });
    
    if (userInvitationsError) {
      // テーブルが存在しない場合はエラーになる
      console.log('[API] user_invitations table does not exist:', userInvitationsError);
      return NextResponse.json({ 
        success: false, 
        message: 'user_invitations table does not exist',
        error: userInvitationsError
      });
    }
    
    console.log('[API] user_invitations table exists');
    
    // invitationsテーブルが存在するか確認
    const { data: invitationsExists, error: invitationsError } = await supabaseAdmin
      .from(INVITATIONS_TABLE)
      .select('count()', { count: 'exact', head: true });
    
    if (!invitationsError) {
      // テーブルが存在する場合
      console.log(`[API] ${INVITATIONS_TABLE} table already exists`);
      
      // user_invitationsテーブルからデータを取得
      const { data: userInvitations, error: getUserInvitationsError } = await supabaseAdmin
        .from('user_invitations')
        .select('*');
      
      if (getUserInvitationsError) {
        console.error('[API] Error getting data from user_invitations:', getUserInvitationsError);
        return NextResponse.json(
          { success: false, error: getUserInvitationsError },
          { status: 500 },
        );
      }
      
      if (!userInvitations || userInvitations.length === 0) {
        console.log('[API] No data in user_invitations table');
        
        // データがない場合はテーブルを削除
        const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
          query: `DROP TABLE IF EXISTS user_invitations;`
        });
        
        if (dropError) {
          console.error('[API] Error dropping user_invitations table:', dropError);
          return NextResponse.json(
            { success: false, error: dropError },
            { status: 500 },
          );
        }
        
        console.log('[API] Dropped user_invitations table');
        return NextResponse.json({ 
          success: true, 
          message: 'Dropped user_invitations table (no data)'
        });
      }
      
      console.log(`[API] Found ${userInvitations.length} records in user_invitations table`);
      
      // データを移行
      let migratedCount = 0;
      let errors = [];
      
      for (const invitation of userInvitations) {
        // invitationsテーブルに挿入
        const { error: insertError } = await supabaseAdmin
          .from(INVITATIONS_TABLE)
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
        const { error: renameError } = await supabaseAdmin.rpc('exec_sql', {
          query: `ALTER TABLE user_invitations RENAME TO user_invitations_backup;`
        });
        
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
    }
    
    // invitationsテーブルが存在しない場合、user_invitationsテーブルをリネーム
    console.log(`[API] ${INVITATIONS_TABLE} table does not exist, renaming user_invitations`);
    
    const { error: renameError } = await supabaseAdmin.rpc('exec_sql', {
      query: `ALTER TABLE user_invitations RENAME TO ${INVITATIONS_TABLE};`
    });
    
    if (renameError) {
      console.error('[API] Error renaming user_invitations table:', renameError);
      return NextResponse.json(
        { success: false, error: renameError },
        { status: 500 },
      );
    }
    
    console.log(`[API] Successfully renamed user_invitations table to ${INVITATIONS_TABLE}`);
    return NextResponse.json({ 
      success: true, 
      message: `Successfully renamed user_invitations table to ${INVITATIONS_TABLE}`
    });
  } catch (error) {
    console.error('[API] Exception in rename-table API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
