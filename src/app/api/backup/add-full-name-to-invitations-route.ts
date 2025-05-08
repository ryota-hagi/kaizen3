import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // SQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_full_name_to_invitations.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // SQLを複数のステートメントに分割
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // サービスロールキーを使用してRLSをバイパス
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // 各ステートメントを個別に実行
    const results = [];
    for (const statement of statements) {
      console.log('Executing:', statement);
      
      try {
        // SQL実行
        const { data, error } = await supabaseAdmin.rpc('exec_sql_query', { sql_query: statement });
        
        if (error) {
          // 関数が存在しない場合は直接クエリを実行
          if (error.code === 'PGRST202') {
            console.log('exec_sql_query関数が見つかりません。直接クエリを実行します。');
            
            // 直接クエリを実行
            const { data: directData, error: directError } = await supabaseAdmin.rpc('exec_sql', { query: statement });
            
            if (directError) {
              console.error('直接クエリの実行中にエラーが発生しました:', directError);
              results.push({
                statement,
                success: false,
                error: directError
              });
            } else {
              console.log('直接クエリを実行しました:', directData);
              results.push({
                statement,
                success: true,
                data: directData
              });
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
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'invitations')
      .order('ordinal_position');

    if (columnsError) {
      console.error('テーブル構造の確認中にエラーが発生しました:', columnsError);
    } else {
      console.log('invitationsテーブルの構造:', columns);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'invitationsテーブルにfull_nameカラムが追加されました',
      details: {
        results,
        columns
      }
    });
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
