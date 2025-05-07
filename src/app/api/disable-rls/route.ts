import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { table } = await request.json();

    if (!table) {
      return NextResponse.json(
        { error: 'テーブル名が指定されていません' },
        { status: 400 }
      );
    }

    // Supabase接続情報を環境変数から取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase接続情報が設定されていません' },
        { status: 500 }
      );
    }

    // サービスロールキーを使用してSupabaseクライアントを作成（管理者権限）
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RLSを無効化するSQLクエリを実行
    const disableRlsQuery = `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`;
    
    const { error: disableRlsError } = await supabase.rpc('execute_sql', {
      query: disableRlsQuery
    });

    if (disableRlsError) {
      console.error('RLS無効化エラー:', disableRlsError);
      
      // 直接SQLを実行する代わりに、エラーを返す
      console.error('RLS無効化エラー:', disableRlsError);
      return NextResponse.json(
        { 
          error: 'RLSの無効化に失敗しました', 
          details: disableRlsError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `${table}テーブルのRLSを無効化しました` 
    });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json(
      { 
        error: 'RLSの無効化中にエラーが発生しました', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
