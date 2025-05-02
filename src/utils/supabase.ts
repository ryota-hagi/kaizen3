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

// APIレスポンスの型定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: any;
  errorType?: string;
  errorMessage?: string;
}

// 招待トークンを生成する関数
export const generateInviteToken = (): string => {
  return crypto.randomUUID();
};

// 招待情報をSupabaseに保存する関数
export const saveInvitation = async (invitation: Omit<InvitationRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<InvitationRecord>> => {
  try {
    console.log('[Supabase] Saving invitation to Supabase:', invitation);
    console.log('[Supabase] Table name:', INVITATIONS_TABLE);
    
    // 直接Supabaseを使用しないようにする
    console.log('► before fetch', invitation);
    let response;
    try {
      // テスト用に/api/pingを呼び出す
      console.log('► calling /api/ping for testing');
      const pingResponse = await fetch('/api/ping', {
        method: 'POST',
      });
      const pingResult = await pingResponse.json();
      console.log('► ping result:', pingResult);
      
      // 本来の呼び出し
      console.log('► calling /api/invitations');
      response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitation),
      });
      console.log('► after fetch', response.status);
    } catch (fetchError) {
      console.error('► fetch error', fetchError);
      return { 
        success: false, 
        error: fetchError,
        errorMessage: 'Fetch operation failed'
      };
    }
    
    const result = await response.json();
    
    // 新しいAPIレスポンス形式に対応
    if (!response.ok || !result.success) {
      console.error('[Supabase] API error saving invitation:', result.error);
      
      // エラーの詳細情報がある場合は表示
      if (result.errorType) {
        console.error(`[Supabase] Error type: ${result.errorType}`);
        console.error(`[Supabase] Error message: ${result.errorMessage}`);
        
        // RLSエラーの場合の特別なメッセージ
        if (result.errorType === 'rls_policy') {
          console.error('[Supabase] RLSポリシーエラー: テーブルのRLSポリシーを確認してください。一時的に "ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;" を実行することで問題を回避できます。');
        }
        
        // カラム名エラーの場合の特別なメッセージ
        if (result.errorType === 'column_not_exist') {
          console.error('[Supabase] カラム名エラー: カラム名がスネークケース（例：company_id）になっているか確認してください。');
        }
      }
      
      return { 
        success: false, 
        error: result.error,
        errorType: result.errorType,
        errorMessage: result.errorMessage
      };
    }
    
    if (!result.data) {
      console.error('[Supabase] No data returned from API');
      return { success: false, error: { message: 'No data returned from API' } };
    }
    
    console.log('[Supabase] Successfully saved invitation via API:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Supabase] Exception saving invitation:', error);
    return { success: false, error };
  }
};

// 招待トークンを検証する関数
export const verifyInviteToken = async (token: string): Promise<{ valid: boolean; invitation?: InvitationRecord; error?: any; errorType?: string; errorMessage?: string }> => {
  try {
    console.log('[Supabase] Verifying invite token:', token);
    
    // APIルートを使用してサーバーサイドで処理する
    const response = await fetch('/api/invitations/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[Supabase] API error verifying invitation:', result.error);
      return { valid: false, error: result.error };
    }
    
    if (!result.valid) {
      console.log('[Supabase] Token verification failed via API');
      return { valid: false };
    }
    
    if (!result.invitation) {
      console.error('[Supabase] No invitation data returned from API');
      return { valid: false, error: { message: 'No invitation data returned from API' } };
    }
    
    console.log('[Supabase] Successfully verified invitation via API:', result.invitation);
    return { valid: true, invitation: result.invitation as InvitationRecord };
  } catch (error) {
    console.error('[Supabase] Exception verifying invite token:', error);
    return { valid: false, error };
  }
};

// 招待を完了する関数
export const completeInvitation = async (token: string, userData: { email: string }): Promise<ApiResponse<InvitationRecord>> => {
  try {
    console.log('[Supabase] Completing invitation with token:', token);
    
    // APIルートを使用してサーバーサイドで処理する
    const response = await fetch('/api/invitations/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, userData }),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('[Supabase] API error completing invitation:', result.error);
      return { success: false, error: result.error };
    }
    
    if (!result.data) {
      console.error('[Supabase] No data returned from API');
      return { success: false, error: { message: 'No data returned from API' } };
    }
    
    console.log('[Supabase] Successfully completed invitation via API:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Supabase] Exception completing invitation:', error);
    return { success: false, error };
  }
};
