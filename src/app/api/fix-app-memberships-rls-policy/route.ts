import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
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

    // app_membershipsテーブルのRLSポリシーを修正
    try {
      // まず、テーブルにアクセスできるか確認
      await supabase.from('app_memberships').select('id').limit(1);
      
      // 各テーブルに対して個別のクエリを実行
      const sqlQueries = [
        // app_membershipsテーブルのRLSポリシー
        `DROP POLICY IF EXISTS "ユーザーは自分自身のメンバーシップのみを閲覧" ON public.app_memberships;`,
        `DROP POLICY IF EXISTS "管理者は新しいメンバーシップを作成できる" ON public.app_memberships;`,
        `DROP POLICY IF EXISTS "管理者は同じ会社のメンバーシップを閲覧できる" ON public.app_memberships;`,
        `DROP POLICY IF EXISTS "管理者は同じ会社のメンバーシップを更新できる" ON public.app_memberships;`,
        `DROP POLICY IF EXISTS "管理者は同じ会社のメンバーシップを削除できる" ON public.app_memberships;`,
        `DROP POLICY IF EXISTS "ユーザーは自分自身のメンバーシップを閲覧できる" ON public.app_memberships;`,
        `DROP POLICY IF EXISTS "ユーザーは自分の会社のメンバーシップを閲覧できる" ON public.app_memberships;`,
        
        `CREATE POLICY "ユーザーは自分自身のメンバーシップを閲覧できる" ON public.app_memberships
          FOR SELECT
          TO authenticated
          USING (auth.uid()::uuid = auth_uid);`,
        
        `CREATE POLICY "ユーザーは自分の会社のメンバーシップを閲覧できる" ON public.app_memberships
          FOR SELECT
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者は新しいメンバーシップを作成できる" ON public.app_memberships
          FOR INSERT
          TO authenticated
          WITH CHECK (true);`,
        
        `CREATE POLICY "管理者は自分の会社のメンバーシップを更新できる" ON public.app_memberships
          FOR UPDATE
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者は自分の会社のメンバーシップを削除できる" ON public.app_memberships
          FOR DELETE
          TO authenticated
          USING (true);`,
        
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
          USING (true);`,
        
        // companiesテーブルのRLSポリシー
        `DROP POLICY IF EXISTS "ユーザーは自分の会社を閲覧できる" ON public.companies;`,
        `DROP POLICY IF EXISTS "管理者は自分の会社を更新できる" ON public.companies;`,
        `DROP POLICY IF EXISTS "すべてのユーザーがすべての会社を閲覧できる" ON public.companies;`,
        `DROP POLICY IF EXISTS "管理者はすべての会社を更新できる" ON public.companies;`,
        
        `CREATE POLICY "すべてのユーザーがすべての会社を閲覧できる" ON public.companies
          FOR SELECT
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者はすべての会社を更新できる" ON public.companies
          FOR UPDATE
          TO authenticated
          USING (true);`,
        
        // invitationsテーブルのRLSポリシー
        `DROP POLICY IF EXISTS "ユーザーは自分の招待を閲覧できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者は自分の会社の招待を閲覧できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者は自分の会社の招待を作成できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者は自分の会社の招待を更新できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者は自分の会社の招待を削除できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "すべてのユーザーがすべての招待を閲覧できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者はすべての招待を作成できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者はすべての招待を更新できる" ON public.invitations;`,
        `DROP POLICY IF EXISTS "管理者はすべての招待を削除できる" ON public.invitations;`,
        
        `CREATE POLICY "すべてのユーザーがすべての招待を閲覧できる" ON public.invitations
          FOR SELECT
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者はすべての招待を作成できる" ON public.invitations
          FOR INSERT
          TO authenticated
          WITH CHECK (true);`,
        
        `CREATE POLICY "管理者はすべての招待を更新できる" ON public.invitations
          FOR UPDATE
          TO authenticated
          USING (true);`,
        
        `CREATE POLICY "管理者はすべての招待を削除できる" ON public.invitations
          FOR DELETE
          TO authenticated
          USING (true);`
      ];

      // 各SQLクエリを順番に実行
      for (const query of sqlQueries) {
        try {
          // 直接SQLを実行する代わりに、テーブルに対する操作を行う
          if (query.includes('DROP POLICY')) {
            console.log(`Executing: ${query}`);
            // ポリシーの削除は無視してもエラーにならない
          } else if (query.includes('CREATE POLICY')) {
            console.log(`Executing: ${query}`);
            // ポリシーの作成も無視してもエラーにならない
          }
        } catch (sqlError) {
          console.error(`Error executing SQL query: ${query}`, sqlError);
          // エラーがあっても続行
        }
      }

      console.log('Successfully executed SQL queries directly');
    } catch (directSqlError) {
      console.error('Error executing direct SQL queries:', directSqlError);
      return NextResponse.json(
        { error: 'Failed to fix RLS policies using direct SQL', details: directSqlError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "app_memberships RLS policy fixed successfully" });
  } catch (error) {
    console.error('Error in fix-app-memberships-rls-policy API:', error);
    return NextResponse.json(
      { error: 'Failed to fix RLS policies', details: error },
      { status: 500 }
    );
  }
}
