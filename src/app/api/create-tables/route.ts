import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

// テーブル作成APIルート
export async function POST(req: NextRequest) {
  try {
    // 認証用Supabaseクライアントを取得
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // 認証チェック
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // データ操作用Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // マイグレーションファイルのパス
    const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    
    // 従業員テーブル作成
    const employeesTableSql = fs.readFileSync(
      path.join(migrationsDir, 'create_employees_table.sql'),
      'utf8'
    );
    
    const { error: employeesError } = await supabase.rpc('exec_sql', {
      sql_query: employeesTableSql
    });
    
    if (employeesError) {
      console.error('[API] Failed to create employees table:', employeesError);
      return NextResponse.json(
        { success: false, error: employeesError.message },
        { status: 500 }
      );
    }
    
    // テンプレートテーブル作成
    const templatesTableSql = fs.readFileSync(
      path.join(migrationsDir, 'create_templates_table.sql'),
      'utf8'
    );
    
    const { error: templatesError } = await supabase.rpc('exec_sql', {
      sql_query: templatesTableSql
    });
    
    if (templatesError) {
      console.error('[API] Failed to create templates table:', templatesError);
      return NextResponse.json(
        { success: false, error: templatesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tables created successfully'
    });
  } catch (error) {
    console.error('[API] Unexpected error in create-tables:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// テーブル存在確認APIルート
export async function GET(req: NextRequest) {
  try {
    // 認証用Supabaseクライアントを取得
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // 認証チェック
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // データ操作用Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // テーブル存在確認クエリ
    const checkTablesQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      ) as employees_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'templates'
      ) as templates_exists;
    `;

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: checkTablesQuery
    });

    if (error) {
      console.error('[API] Failed to check tables:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 結果を解析
    const result = data && Array.isArray(data) && data.length > 0 ? data[0] : null;
    const tablesExist = {
      employees: result?.employees_exists === true,
      templates: result?.templates_exists === true
    };

    return NextResponse.json({
      success: true,
      data: tablesExist
    });
  } catch (error) {
    console.error('[API] Unexpected error in check-tables:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
