import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの作成
// 環境変数からURLとAnonymous Keyを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseクライアントのインスタンスを作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 招待関連のテーブル名
// 注: 実際のテーブル名を確認して設定
export const INVITATIONS_TABLE = 'invitations';

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
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .insert([invitation])
      .select()
      .single();

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
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

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
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString(),
        email: userData.email // 実際のユーザーのメールアドレスで更新
      })
      .eq('invite_token', token)
      .select()
      .single();

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
