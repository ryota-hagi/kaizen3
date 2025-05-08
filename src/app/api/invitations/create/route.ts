import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, fullName, role, companyId, invitedBy } = await req.json();
    
    // バリデーション
    if (!email || !role || !companyId || !invitedBy) {
      return NextResponse.json({ 
        success: false, 
        message: '必須パラメータが不足しています' 
      }, { status: 400 });
    }
    
    // サービスロールキーを使用してRLSをバイパス
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // 招待トークンの生成
    const token = crypto.randomUUID();
    
    // 有効期限を設定（7日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // invitationsテーブルに招待情報を保存
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        full_name: fullName || '',
        company_id: companyId,
        role,
        token,
        invite_token: token, // 互換性のために両方のカラムに保存
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select();
    
    if (error) {
      console.error('[Supabase] Error creating invitation:', error);
      
      // 既に招待されている場合
      if (error.code === '23505') {
        return NextResponse.json({ 
          success: false, 
          message: 'このメールアドレスは既に招待されています' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        success: false, 
        message: '招待の作成に失敗しました',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${email}に招待を送信しました`, 
      inviteToken: token,
      data
    });
  } catch (error) {
    console.error('[Supabase] Exception creating invitation:', error);
    return NextResponse.json({ 
      success: false, 
      message: '招待処理中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
