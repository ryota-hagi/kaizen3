import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, params } = body;
    
    if (!operation) {
      return NextResponse.json({ error: '操作タイプが指定されていません' }, { status: 400 });
    }
    
    const client = supabase();
    let result;
    
    switch (operation) {
      case 'execute_sql':
        // SQLクエリを実行
        if (params.query.toLowerCase().includes('select')) {
          // SELECTクエリの場合
          const { data, error } = await client.rpc('execute_sql', { 
            sql_query: params.query 
          });
          
          if (error) {
            throw new Error(`SQL実行エラー: ${error.message}`);
          }
          
          result = data;
        } else if (params.query.toLowerCase().includes('update')) {
          // UPDATEクエリの場合
          // ワークフローの更新
          if (params.query.toLowerCase().includes('workflows')) {
            const matches = params.query.match(/id\s*=\s*'([^']+)'/i);
            const isCompletedMatch = params.query.match(/is_completed\s*=\s*(true|false)/i);
            
            if (matches && matches[1] && isCompletedMatch && isCompletedMatch[1]) {
              const id = matches[1];
              const isCompleted = isCompletedMatch[1] === 'true';
              const completedAt = isCompleted ? new Date().toISOString() : null;
              
              const { data, error } = await client
                .from('workflows')
                .update({
                  is_completed: isCompleted,
                  completed_at: completedAt,
                  updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
                
              if (error) {
                throw new Error(`ワークフロー更新エラー: ${error.message}`);
              }
              
              result = data;
            } else {
              throw new Error('ワークフローIDまたは完了状態が見つかりません');
            }
          } else {
            throw new Error('サポートされていないUPDATEクエリです');
          }
        } else if (params.query.toLowerCase().includes('delete')) {
          // DELETEクエリの場合
          // ワークフローの削除
          if (params.query.toLowerCase().includes('workflows')) {
            const matches = params.query.match(/id\s*=\s*'([^']+)'/i);
            
            if (matches && matches[1]) {
              const id = matches[1];
              
              const { data, error } = await client
                .from('workflows')
                .delete()
                .eq('id', id)
                .select();
                
              if (error) {
                throw new Error(`ワークフロー削除エラー: ${error.message}`);
              }
              
              result = data;
            } else {
              throw new Error('ワークフローIDが見つかりません');
            }
          } else {
            throw new Error('サポートされていないDELETEクエリです');
          }
        } else {
          throw new Error('サポートされていないSQLクエリです');
        }
        break;
        
      default:
        return NextResponse.json({ error: '不明な操作タイプです' }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Supabase操作エラー:', error);
    return NextResponse.json({ 
      error: `Supabase操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }, { status: 500 });
  }
}
