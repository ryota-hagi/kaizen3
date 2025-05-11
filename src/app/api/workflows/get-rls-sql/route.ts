import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 明示的に動的ルートとして設定
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');
    
    if (!fileName) {
      return NextResponse.json({ 
        success: false, 
        message: 'ファイル名が指定されていません' 
      }, { status: 400 });
    }
    
    // SQLファイルを読み込む
    const filePath = path.join(process.cwd(), 'src/db/migrations', fileName);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        message: `ファイルが見つかりません: ${fileName}` 
      }, { status: 404 });
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      sql: sqlContent
    });
  } catch (error) {
    console.error('SQLファイル取得エラー:', error);
    return NextResponse.json({ 
      success: false, 
      message: `SQLファイルの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
