import { UserInfo } from '@/utils/api';
import { Dispatch, SetStateAction } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';

// ユーザー招待関数
export const inviteUser = async (
  inviteData: {email: string; role: string; companyId: string},
  currentUser: UserInfo | null,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>
): Promise<{success: boolean, message?: string, inviteToken?: string}> => {
  try {
    if (!currentUser) {
      return { success: false, message: '認証されていません' };
    }
    
    const client = supabase();
    
    // 招待トークンの生成
    const token = crypto.randomUUID();
    
    // 有効期限を設定（7日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // invitationsテーブルに招待情報を保存
    const { data, error } = await client
      .from('invitations')
      .insert({
        email: inviteData.email,
        company_id: inviteData.companyId,
        role: inviteData.role,
        token: token,
        invite_token: token, // 互換性のために両方のカラムに保存
        invited_by: currentUser.id,
        expires_at: expiresAt.toISOString()
      })
      .select();
    
    if (error) {
      console.error('[Supabase] Error creating invitation:', error);
      
      // 既に招待されている場合
      if (error.code === '23505') {
        return { success: false, message: 'このメールアドレスは既に招待されています' };
      }
      
      return { success: false, message: '招待の作成に失敗しました' };
    }
    
    // 招待メールの送信（実際のプロジェクトではメール送信APIを使用）
    // ここではダミー処理
    console.log(`招待メールを送信: ${inviteData.email}, トークン: ${token}`);
    
    // 招待ユーザー情報をローカルストレージに追加
    const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
    // 招待ユーザー情報を作成
    const invitedUser: UserInfo = {
      id: `invited_${token}`, // 仮のID
      username: inviteData.email.split('@')[0],
      email: inviteData.email,
      fullName: '',
      role: inviteData.role,
      status: '招待中',
      createdAt: new Date().toISOString(),
      lastLogin: '',
      isInvited: true,
      inviteToken: token,
      companyId: inviteData.companyId
    };
    
    // ユーザーリストに追加
    const updatedUsers = [...currentUsers, invitedUser];
    setUsers(updatedUsers);
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      const usersToSave = updatedUsers.map(u => ({
        user: u,
        password: currentPasswords[u.id] || ''
      }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    }
    
    return { 
      success: true, 
      message: `${inviteData.email}に招待を送信しました`, 
      inviteToken: token 
    };
  } catch (error) {
    console.error('[Supabase] Exception creating invitation:', error);
    return { success: false, message: '招待処理中にエラーが発生しました' };
  }
};

// 招待データの型定義
interface InvitationData {
  id: string;
  email: string;
  company_id: string;
  role: string;
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

// 招待トークン検証関数
export const verifyInviteToken = async (
  token: string,
  users: UserInfo[],
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setCompanyId: Dispatch<SetStateAction<string>>
): Promise<{valid: boolean; user?: UserInfo; error?: any}> => {
  try {
    const client = supabase();
    
    // invitationsテーブルからトークンを検索（tokenまたはinvite_tokenで検索）
    const { data, error } = await client
      .from('invitations')
      .select('*')
      .or(`token.eq.${token},invite_token.eq.${token}`)
      .is('accepted_at', null)
      .single();
    
    if (error || !data) {
      console.error('[Supabase] Error verifying invite token:', error);
      return { valid: false, error: '無効な招待トークンです' };
    }
    
    // データを適切な型にキャスト
    const invitationData = data as unknown as InvitationData;
    
    // 有効期限のチェック
    if (invitationData.expires_at && new Date(invitationData.expires_at) < new Date()) {
      return { valid: false, error: '招待の有効期限が切れています' };
    }
    
    // 会社IDを設定
    setCompanyId(invitationData.company_id);
    
    // 招待情報からユーザー情報を作成
    const invitedUser: UserInfo = {
      id: '', // 実際のIDはログイン後に設定される
      username: invitationData.email.split('@')[0],
      email: invitationData.email,
      fullName: '',
      role: invitationData.role,
      status: '招待中',
      createdAt: new Date().toISOString(),
      lastLogin: '',
      isInvited: true,
      inviteToken: token,
      companyId: invitationData.company_id
    };
    
    return { valid: true, user: invitedUser };
  } catch (error) {
    console.error('[Supabase] Exception verifying invite token:', error);
    return { valid: false, error: '招待の検証中にエラーが発生しました' };
  }
};

// 招待完了関数
export const completeInvitation = async (
  token: string,
  userData: {fullName: string; companyId?: string},
  setCurrentUser: Dispatch<SetStateAction<UserInfo | null>>,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>,
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>
): Promise<boolean> => {
  try {
    const client = supabase();
    
    // 現在のユーザー情報を取得
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      console.error('[Supabase] Error getting user:', userError);
      return false;
    }
    
    // invitationsテーブルを更新
    const { error: updateError } = await client
      .from('invitations')
      .update({
        accepted_at: new Date().toISOString()
      })
      .eq('token', token);
    
    if (updateError) {
      console.error('[Supabase] Error updating invitation:', updateError);
      return false;
    }
    
    // 招待情報を取得（tokenまたはinvite_tokenで検索）
    const { data, error: getError } = await client
      .from('invitations')
      .select('*')
      .or(`token.eq.${token},invite_token.eq.${token}`)
      .single();
    
    if (getError || !data) {
      console.error('[Supabase] Error getting invitation data:', getError);
      return false;
    }
    
    // データを適切な型にキャスト
    const invitationData = data as unknown as InvitationData;
    
    // ユーザー情報を更新
    const updatedUserData: Partial<UserInfo> = {
      fullName: userData.fullName,
      companyId: userData.companyId || invitationData.company_id,
      status: 'アクティブ',
      isInvited: false,
      role: invitationData.role || '一般ユーザー'
    };
    
    // ユーザーメタデータを更新
    await client.auth.updateUser({
      data: {
        full_name: userData.fullName,
        company_id: updatedUserData.companyId,
        role: updatedUserData.role
      }
    });
    
    // app_usersテーブルにユーザー情報を保存
    const { saveUserToDatabase } = await import('@/lib/supabaseClient');
    await saveUserToDatabase(user.id, {
      email: user.email || '',
      fullName: userData.fullName,
      role: updatedUserData.role,
      status: 'アクティブ',
      companyId: updatedUserData.companyId || '',
      createdAt: user.created_at,
      invited_by: invitationData.invited_by,
      invitation_accepted_at: new Date().toISOString()
    });
    
    // ローカルストレージのユーザー情報を更新
    const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
    // 新しいユーザー情報を作成
    const newUserInfo: UserInfo = {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      email: user.email || '',
      fullName: userData.fullName,
      role: updatedUserData.role || '一般ユーザー',
      status: 'アクティブ',
      createdAt: user.created_at as string,
      lastLogin: new Date().toISOString(),
      isInvited: false,
      inviteToken: '',
      companyId: updatedUserData.companyId || ''
    };
    
    // 招待中のユーザーを削除
    const updatedUsers = currentUsers.filter(u => !u.isInvited || u.inviteToken !== token);
    
    // 新しいユーザーを追加
    updatedUsers.push(newUserInfo);
    
    // 状態を更新
    setCurrentUser(newUserInfo);
    setUsers(updatedUsers);
    setIsAuthenticated(true);
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserInfo));
      
      const usersToSave = updatedUsers.map(u => ({
        user: u,
        password: currentPasswords[u.id] || ''
      }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    }
    
    return true;
  } catch (error) {
    console.error('[Supabase] Exception completing invitation:', error);
    return false;
  }
};
