import { UserInfo } from '@/utils/api';
import { Dispatch, SetStateAction } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';

// ユーザー招待関数
export const inviteUser = async (
  inviteData: {email: string; fullName?: string; role: string; companyId: string},
  currentUser: UserInfo | null,
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setUserPasswords: Dispatch<SetStateAction<Record<string, string>>>
): Promise<{success: boolean, message?: string, inviteToken?: string}> => {
  try {
    if (!currentUser) {
      return { success: false, message: '認証されていません' };
    }
    
    // サーバーサイドAPIを使用して招待を作成
    const response = await fetch('/api/invitations/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: inviteData.email,
        fullName: inviteData.fullName || '',
        role: inviteData.role,
        companyId: inviteData.companyId,
        invitedBy: currentUser.id
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('[API] Error creating invitation:', result);
      return { 
        success: false, 
        message: result.message || '招待の作成に失敗しました' 
      };
    }
    
    // 招待トークンを取得
    const token = result.inviteToken;
    
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
      fullName: inviteData.fullName || '',
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
  full_name?: string;
}

// 招待トークン検証関数
export const verifyInviteToken = async (
  token: string,
  users: UserInfo[],
  setUsers: Dispatch<SetStateAction<UserInfo[]>>,
  setCompanyId: Dispatch<SetStateAction<string>>
): Promise<{valid: boolean; user?: UserInfo; error?: any}> => {
  try {
    // サーバーサイドAPIを使用して招待を検証
    const response = await fetch(`/api/invitations/verify?token=${encodeURIComponent(token)}`);
    const result = await response.json();
    
    if (!response.ok || !result.valid) {
      console.error('[API] Error verifying invite token:', result);
      return { 
        valid: false, 
        error: result.error || '無効な招待トークンです' 
      };
    }
    
    const invitation = result.invitation;
    
    // 会社IDを設定
    setCompanyId(invitation.company_id);
    
    // 招待情報からユーザー情報を作成
    const invitedUser: UserInfo = {
      id: '', // 実際のIDはログイン後に設定される
      username: invitation.email.split('@')[0],
      email: invitation.email,
      fullName: invitation.full_name || '',
      role: invitation.role,
      status: '招待中',
      createdAt: new Date().toISOString(),
      lastLogin: '',
      isInvited: true,
      inviteToken: token,
      companyId: invitation.company_id
    };
    
    return { valid: true, user: invitedUser };
  } catch (error) {
    console.error('[API] Exception verifying invite token:', error);
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
    
    // サーバーサイドAPIを使用して招待を完了
    const response = await fetch('/api/invitations/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        userData,
        userId: user.id
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('[API] Error completing invitation:', result);
      return false;
    }
    
    // ユーザー情報を更新
    const updatedUserData: Partial<UserInfo> = {
      fullName: userData.fullName,
      companyId: userData.companyId || result.userData.companyId,
      status: 'アクティブ',
      isInvited: false,
      role: result.userData.role || '一般ユーザー'
    };
    
    // ユーザーメタデータを更新
    await client.auth.updateUser({
      data: {
        full_name: userData.fullName,
        company_id: updatedUserData.companyId,
        role: updatedUserData.role
      }
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
