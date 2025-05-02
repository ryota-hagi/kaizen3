import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの作成
// 環境変数からURLとAnonymous Keyを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseクライアントのインスタンスを作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 招待関連の定数をインポート
import {
  INVITATIONS_TABLE,
  INVITATIONS_VIEW,
  INVITE_STATUS_PENDING,
  INVITE_STATUS_ACCEPTED,
  INVITE_STATUS_EXPIRED
} from '@/constants/invitations';

// 他のファイルでも使えるように再エクスポート
export {
  INVITATIONS_TABLE,
  INVITATIONS_VIEW,
  INVITE_STATUS_PENDING,
  INVITE_STATUS_ACCEPTED,
  INVITE_STATUS_EXPIRED
};

// デバッグ用：テーブル名を確認
console.log('[DEBUG] Defined INVITATIONS_TABLE =', INVITATIONS_TABLE);

// 招待情報の型定義
export interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  company_id: string;
  invite_token: string;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  updated_at: string;
}

// 招待トークンを生成する関数
export const generateInviteToken = (): string => {
  return crypto.randomUUID();
};

// 招待情報をSupabaseに保存する関数
export const saveInvitation = async (invitation: Omit<InvitationRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: InvitationRecord; error?: any }> => {
  try {
    console.log('[Supabase] Saving invitation to Supabase:', invitation);
    console.log('[Supabase] Table name:', INVITATIONS_TABLE);
    
    // 注: insertはビューではなく元のテーブルに対して行う必要がある
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .insert([{
        email: invitation.email,
        role: invitation.role,
        company_id: invitation.company_id,
        invite_token: invitation.invite_token,
        status: invitation.status
      }])
      .select()
      .single();
    
    // エラーの詳細をログに出力
    if (error) {
      console.error('[Supabase] Error details:', JSON.stringify(error, null, 2));
      console.error('[Supabase] Error code:', error.code);
      console.error('[Supabase] Error message:', error.message);
      console.error('[Supabase] Error details:', error.details);
      console.error('[Supabase] Error hint:', error.hint);
    }

    if (error) {
      console.error('[Supabase] Error saving invitation:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception saving invitation:', error);
    return { success: false, error };
  }
};

// 招待トークンを検証する関数
export const verifyInviteToken = async (token: string): Promise<{ valid: boolean; invitation?: InvitationRecord; error?: any }> => {
  try {
    console.log('[Supabase] Verifying invite token:', token);
    
    // まずビューで検索を試みる
    let result = await supabase
      .from(INVITATIONS_VIEW) // 定数を使用
      .select('*')
      .eq('invite_token', token) // snake_caseのカラム名を使用
      .eq('status', INVITE_STATUS_PENDING) // 定数を使用
      .maybeSingle(); // 0件の場合はnullを返す
    
    // ビューでエラーが発生した場合、直接テーブルで検索
    if (result.error) {
      console.log('[Supabase] Error with view, trying direct table:', result.error);
      result = await supabase
        .from(INVITATIONS_TABLE)
        .select('*')
        .eq('invite_token', token)
        .eq('status', INVITE_STATUS_PENDING)
        .maybeSingle();
    }
    
    // データが見つからない場合
    if (!result.data) {
      console.log('[Supabase] No invitation found with token:', token);
      return { valid: false };
    }
    
    const { data, error } = result;
    
    // エラーの詳細をログに出力
    if (error) {
      console.error('[Supabase] Error details:', JSON.stringify(error, null, 2));
      console.error('[Supabase] Error code:', error.code);
      console.error('[Supabase] Error message:', error.message);
    }

    if (error) {
      console.error('[Supabase] Error verifying invite token:', error);
      return { valid: false, error };
    }

    return { valid: true, invitation: data as InvitationRecord };
  } catch (error) {
    console.error('[Supabase] Exception verifying invite token:', error);
    return { valid: false, error };
  }
};

// 招待を完了する関数
export const completeInvitation = async (token: string, userData: { email: string }): Promise<{ success: boolean; data?: InvitationRecord; error?: any }> => {
  try {
    // 同じメールアドレスの古い招待を削除（トークンが異なるもの）
    await supabase
      .from(INVITATIONS_TABLE)
      .delete()
      .eq('email', userData.email)
      .neq('invite_token', token);
    
    // 注: updateはビューではなく元のテーブルに対して行う必要がある
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .update({ 
        status: INVITE_STATUS_ACCEPTED,
        updated_at: new Date().toISOString(),
        email: userData.email // 実際のユーザーのメールアドレスで更新
      })
      .eq('invite_token', token)
      .select()
      .maybeSingle();
    
    // データが見つからない場合
    if (!data) {
      console.log('[Supabase] No invitation found with token:', token);
      return { success: false, error: { message: '招待が見つかりませんでした' } };
    }

    if (error) {
      console.error('[Supabase] Error completing invitation:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception completing invitation:', error);
    return { success: false, error };
  }
};
