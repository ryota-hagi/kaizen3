import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // SQLファイルを読み込む
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_invitations_rls_policy.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Supabaseに接続してSQLを実行
    const client = supabase();
    const { error } = await client.rpc('exec_sql', { sql });

    if (error) {
      console.error('RLSポリシー設定中にエラーが発生しました:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'invitationsテーブルのRLSポリシーが正常に設定されました' });
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
