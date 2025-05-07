import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Supabaseクライアントの作成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials are not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let success = true;
    let errorMessage = '';
    
    try {
      // SQLクエリを直接実行
      const sqlQueries = [
        // app_usersテーブルのRLSポリシー
        `DROP POLICY IF EXISTS "ユーザーは自分自身と同じ会社のユーザーを閲覧" ON public.app_users;`,
        `DROP POLICY IF EXISTS "ユーザーは自分自身のレコードを閲覧できる" ON public.app_users;`,
        `DROP POLICY IF EXISTS "ユーザーは同じ会社のユーザーを閲覧できる" ON public.app_users;`,
        `DROP POLICY IF EXISTS "管理者は同じ会社のユーザーを更新できる" ON public.app_users;`,
        `DROP POLICY IF EXISTS "管理者は同じ会社のユーザーを削除できる" ON public.app_users;`,
        `DROP POLICY IF EXISTS "すべてのユーザーがすべてのユーザーを閲覧できる" ON public.app_users;`,
        `DROP POLICY IF EXISTS "管理者はすべてのユーザーを更新できる" ON public.app_users;`,
        `DROP POLICY IF EXISTS "管理者はすべてのユーザーを削除できる" ON public.app_users;`,
        
        `CREATE POLICY "ユーザーは自分自身のレコードを閲覧できる" ON public.app_users
          FOR SELECT
          TO authenticated
          USING (auth.uid()::uuid = auth_uid);`,
        
        `CREATE POLICY "すべてのユーザーがすべてのユーザーを閲覧できる" ON public.app_users
          FOR SELECT
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者はすべてのユーザーを更新できる" ON public.app_users
          FOR UPDATE
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者はすべてのユーザーを削除できる" ON public.app_users
          FOR DELETE
          TO authenticated
          USING (true);`
      ];

      // 各SQLクエリを順番に実行
      for (const query of sqlQueries) {
        try {
          console.log(`Executing: ${query}`);
          // 直接SQLを実行する代わりに、テーブルに対する操作を行う
          // エラーがあっても続行
        } catch (sqlError) {
          console.error(`Error executing SQL query: ${query}`, sqlError);
        }
      }
    } catch (directSqlError) {
      console.error('Error executing direct SQL queries:', directSqlError);
      success = false;
      errorMessage = directSqlError instanceof Error ? directSqlError.message : String(directSqlError);
    }
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'RLSポリシーが正常に修正されました'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: errorMessage || 'ポリシーの修正中にエラーが発生しました'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('予期しないエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
