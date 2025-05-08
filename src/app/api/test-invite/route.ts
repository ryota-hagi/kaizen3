import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    // テスト用のデータ
    const testData = {
      email: 'test@example.com',
      role: '一般ユーザー',
      companyId: 'KZ-6PIFLNW',
      invitedBy: '17ee5a88-e9b3-4a55-a497-e2c26d0890c5'
    };
    
    // 招待トークンの生成
    const token = crypto.randomUUID();
    
    // 有効期限を設定（7日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // サービスロールキーを使用してRLSをバイパス
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // invitationsテーブルに招待情報を保存
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: testData.email,
        company_id: testData.companyId,
        role: testData.role,
        token: token,
        invite_token: token, // 互換性のために両方のカラムに保存
        invited_by: testData.invitedBy,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select();
    
    if (error) {
      console.error('[Supabase] Error creating invitation:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    // テーブルの内容を確認
    const { data: invitations, error: selectError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (selectError) {
      console.error('[Supabase] Error selecting invitations:', selectError);
      return NextResponse.json({ 
        success: true, 
        message: '招待を作成しましたが、テーブルの確認中にエラーが発生しました',
        data,
        error: selectError.message
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '招待を作成しました',
      data,
      invitations
    });
  } catch (error) {
    console.error('[Supabase] Exception creating invitation:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
