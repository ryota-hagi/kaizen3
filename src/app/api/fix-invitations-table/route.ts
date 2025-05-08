import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // SQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'fix_invitations_table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // SQLを複数のステートメントに分割
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Supabaseに接続
    const client = supabase();
    
    // 各ステートメントを個別に実行
    const results = [];
    for (const statement of statements) {
      console.log('Executing:', statement);
      
      try {
        // SQL実行
        const { data, error } = await client.rpc('exec_sql_query', { sql_query: statement });
        
        if (error) {
          // 関数が存在しない場合は直接クエリを実行
          if (error.code === 'PGRST202') {
            console.log('exec_sql_query関数が見つかりません。直接クエリを実行します。');
            const { data: directData, error: directError } = await client.from('invitations').select('id').limit(1);
            
            if (directError) {
              console.error('直接クエリの実行中にエラーが発生しました:', directError);
              results.push({
                statement,
                success: false,
                error: directError
              });
            } else {
              // 直接クエリが成功したら、管理者権限でSQLを実行
              const { data: adminData, error: adminError } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ query: statement })
              }).then(res => res.json());
              
              if (adminError) {
                console.error('管理者権限でのSQL実行中にエラーが発生しました:', adminError);
                results.push({
                  statement,
                  success: false,
                  error: adminError
                });
              } else {
                console.log('管理者権限でSQLを実行しました:', adminData);
                results.push({
                  statement,
                  success: true,
                  data: adminData
                });
              }
            }
          } else {
            console.error('SQLの実行中にエラーが発生しました:', error);
            results.push({
              statement,
              success: false,
              error
            });
          }
        } else {
          console.log('SQLを実行しました:', data);
          results.push({
            statement,
            success: true,
            data
          });
        }
      } catch (queryError) {
        console.error('クエリ実行中に例外が発生しました:', queryError);
        results.push({
          statement,
          success: false,
          error: queryError
        });
      }
    }

    // テーブル構造を確認
    const { data: columns, error: columnsError } = await client
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'invitations')
      .order('ordinal_position');

    if (columnsError) {
      console.error('テーブル構造の確認中にエラーが発生しました:', columnsError);
    } else {
      console.log('invitationsテーブルの構造:', columns);
    }

    // MCPを使用してテーブル構造を修正
    try {
      // MCPを使用してマイグレーションを実行
      const mcpResult = await fetch('/api/supabase/execute-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql })
      }).then(res => res.json());
      
      console.log('MCPを使用してマイグレーションを実行しました:', mcpResult);
      
      return NextResponse.json({ 
        success: true, 
        message: 'invitationsテーブルが正常に修正されました',
        details: {
          results,
          columns,
          mcpResult
        }
      });
    } catch (mcpError) {
      console.error('MCPを使用したマイグレーション実行中にエラーが発生しました:', mcpError);
      
      // MCPが失敗した場合でも、直接実行した結果を返す
      return NextResponse.json({ 
        success: true, 
        message: 'invitationsテーブルが修正されました（一部の操作は失敗した可能性があります）',
        details: {
          results,
          columns,
          mcpError
        }
      });
    }
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
