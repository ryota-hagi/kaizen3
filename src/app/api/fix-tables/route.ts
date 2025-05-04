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
    
    // リクエストボディを取得
    const body = await req.json();
    
    // SQLクエリが指定されている場合は、それを実行
    if (body.sql) {
      console.log('[API] Executing custom SQL:', body.sql);
      
      try {
        // 直接REST APIを使用してSQLを実行
        const apiUrl = `${url}/rest/v1/rpc/exec_sql`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            query: body.sql
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[API] SQL execution error:', errorText);
          return NextResponse.json(
            { 
              success: false, 
              error: `SQL execution error: ${response.status}`,
              message: errorText
            },
            { status: response.status },
          );
        }
        
        const result = await response.json();
        console.log('[API] SQL execution successful');
        
        return NextResponse.json({
          success: true,
          message: 'SQL executed successfully',
          result
        });
      } catch (error: any) {
        console.error('[API] Exception executing SQL:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'SQL execution error',
            message: error.message
          },
          { status: 500 },
        );
      }
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
          // 直接REST APIを使用してテーブルを作成
          const apiUrl = `${url}/rest/v1/`;
          const response = await fetch(`${apiUrl}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: 'invitations',
              schema: 'public',
              columns: [
                {
                  name: 'id',
                  type: 'uuid',
                  primaryKey: true,
                  defaultValue: 'uuid_generate_v4()'
                },
                {
                  name: 'email',
                  type: 'text',
                  nullable: false
                },
                {
                  name: 'role',
                  type: 'text',
                  nullable: false
                },
                {
                  name: 'company_id',
                  type: 'text',
                  nullable: true
                },
                {
                  name: 'invite_token',
                  type: 'text',
                  nullable: false,
                  unique: true
                },
                {
                  name: 'status',
                  type: 'text',
                  nullable: false,
                  defaultValue: "'pending'"
                },
                {
                  name: 'created_at',
                  type: 'timestamp with time zone',
                  defaultValue: 'now()'
                },
                {
                  name: 'updated_at',
                  type: 'timestamp with time zone',
                  defaultValue: 'now()'
                }
              ]
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            result.errors.push({
              step: 'create_invitations_table',
              error: `API error: ${response.status} - ${errorText}`
            });
            
            return NextResponse.json(result);
          }
          
          result.actions.push({
            step: 'create_invitations_table',
            result: 'invitationsテーブルを作成しました'
          });
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
          // 直接REST APIを使用してデータを挿入
          const apiUrl = `${url}/rest/v1/invitations`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              email: invitation.email,
              role: invitation.role,
              company_id: invitation.company_id || '',
              invite_token: invitation.invite_token,
              status: invitation.status,
              created_at: invitation.created_at,
              updated_at: invitation.updated_at
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            errors.push({
              email: invitation.email,
              error: `API error: ${response.status} - ${errorText}`
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
      // 直接REST APIを使用してテーブルをリネーム
      const apiUrl = `${url}/rest/v1/rpc/exec_sql`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: `ALTER TABLE user_invitations RENAME TO user_invitations_backup;`
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        result.errors.push({
          step: 'rename_table',
          error: `API error: ${response.status} - ${errorText}`
        });
        
        return NextResponse.json(result);
      }
      
      result.actions.push({
        step: 'rename_table',
        result: 'user_invitationsテーブルをuser_invitations_backupにリネームしました'
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
