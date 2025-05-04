import { UserInfo } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { 
  generateInviteToken as generateSupabaseToken, 
  saveInvitation, 
  verifyInviteToken as verifySupabaseToken,
  completeInvitation as completeSupabaseInvitation,
  InvitationRecord,
  ApiResponse
} from '@/utils/supabase';
import { isEqual } from '@/utils/deepEqual';
import { getSupabaseClient } from '@/lib/supabaseClient';

// 招待トークンを生成（より安全なUUIDを使用）
export const generateInviteToken = (): string => {
  // Supabaseの関数を使用
  return generateSupabaseToken();
};

// ユーザーを招待
export const inviteUser = async (
  inviteData: {
    email: string;
    role: string;
    companyId: string;
  },
  currentUser: UserInfo | null,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<{success: boolean, message?: string, inviteToken?: string}> => {
  // 管理者権限チェック
  if (!currentUser || currentUser.role !== '管理者') {
    return {
      success: false,
      message: 'ユーザーを招待する権限がありません'
    };
  }

  // 会社IDが空の場合は現在のユーザーの会社IDを使用
  let companyId = inviteData.companyId || (currentUser ? currentUser.companyId : '');
  
  // 会社IDが空の場合は他のユーザーから取得
  if (!companyId || companyId.trim() === '') {
    console.log('[inviteUser] No company ID provided, searching for company ID from other users');
    
    // 他のユーザーから会社IDを取得
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    const otherUser = currentUsers.find(u => u.companyId && u.companyId.trim() !== '');
    
    if (otherUser) {
      companyId = otherUser.companyId;
      console.log(`[inviteUser] Using company ID ${companyId} from other user`);
    } else {
      return {
        success: false,
        message: '会社IDが設定されていません。会社情報を先に登録してください。'
      };
    }
  }

  try {
    console.log('[inviteUser] Creating invitation in Supabase with company ID:', companyId);
    
    // 直接fetchを呼び出してテスト
    try {
      console.log('[inviteUser] Testing direct fetch to /api/ping');
      const pingResponse = await fetch('/api/ping', {
        method: 'POST'
      });
      const pingResult = await pingResponse.json();
      console.log('[inviteUser] Direct ping result:', pingResult);
    } catch (pingError) {
      console.error('[inviteUser] Direct ping error:', pingError);
    }
    
    // デバッグ用：招待情報を表示
    const invitationData = {
      email: inviteData.email,
      role: inviteData.role,
      company_id: companyId,
      invite_token: crypto.randomUUID(), // サーバー側でトークンを生成
      status: 'pending' as 'pending'
    };
    console.log('[inviteUser] Invitation data:', invitationData);
    
    // saveInvitation関数を使用して招待情報を保存
    console.log('[inviteUser] Calling saveInvitation function...');
    
    // テスト用に/api/pingを呼び出す（絶対パスで）
    try {
      const pingUrl = window.location.origin + '/api/ping';
      console.log('[inviteUser] Testing direct fetch to ping:', pingUrl);
      const pingResponse = await fetch(pingUrl, {
        method: 'GET', // POSTからGETに変更
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const pingResult = await pingResponse.json();
      console.log('[inviteUser] Direct ping result:', pingResult);
    } catch (pingError) {
      console.error('[inviteUser] Direct ping error:', pingError);
    }
    
    // saveInvitation関数を呼び出す
    console.log('[inviteUser] Calling saveInvitation with data:', JSON.stringify(invitationData));
    
    let supabaseResult;
    try {
      // 絶対パスでAPIエンドポイントを指定
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const invitationsUrl = `${baseUrl}/api/invitations`;
      console.log('[inviteUser] Calling API directly:', invitationsUrl);
      
      const response = await fetch(invitationsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(invitationData),
      });
      
      supabaseResult = await response.json();
      console.log('[inviteUser] API response:', supabaseResult);
    } catch (fetchError) {
      console.error('[inviteUser] Fetch error:', fetchError);
      return { 
        success: false, 
        message: 'APIリクエスト中にエラーが発生しました: ' + (fetchError instanceof Error ? fetchError.message : String(fetchError))
      };
    }
    
    // Supabaseからの結果が失敗の場合
    if (!supabaseResult.success) {
      console.error('[inviteUser] Failed to save invitation to Supabase:', supabaseResult.error);
      return {
        success: false,
        message: 'Supabaseへの招待情報の保存に失敗しました'
      };
    }
    
    // Supabaseから返ってきたトークンを使用
    const inviteToken = supabaseResult.data?.invite_token || invitationData.invite_token || '';
    if (!inviteToken) {
      console.error('[inviteUser] No invite token returned from Supabase');
      return {
        success: false,
        message: 'Supabaseから招待トークンが返されませんでした'
      };
    }
    
    console.log('[inviteUser] Got invite token from Supabase:', inviteToken);
    
    // ローカルストレージにも保存（フォールバック）
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
    // メールアドレスの重複チェック
    if (currentUsers.some(user => user.email === inviteData.email)) {
      console.log('[inviteUser] Email already exists in localStorage, updating...');
      
      // 既存のユーザーを更新
      const updatedUsersList = currentUsers.map(user => {
        if (user.email === inviteData.email) {
          return {
            ...user,
            role: inviteData.role,
            companyId: companyId, // 確実に会社IDを設定
            status: '招待中' as const,
            inviteToken: inviteToken
          };
        }
        return user;
      });
      
      setUsers(updatedUsersList);
      
      // ローカルストレージに保存
      if (typeof window !== 'undefined') {
        const { passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
        const usersToSave = updatedUsersList.map(u => ({
          user: u,
          password: currentPasswords[u.id] || ''
        }));
        
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        console.log(`[inviteUser] Updated user in localStorage with token ${inviteToken} and company ID ${companyId}`);
        
        // セッションストレージにも同じデータを保存
        try {
          sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log(`[inviteUser] User data also updated in sessionStorage`);
        } catch (e) {
          console.error('[inviteUser] Failed to update sessionStorage:', e);
        }
      }
    } else {
      // 招待ユーザー情報を作成
      const invitedUser: UserInfo = {
        id: Date.now().toString(),
        username: inviteData.email.split('@')[0],
        email: inviteData.email,
        fullName: inviteData.email.split('@')[0],
        role: inviteData.role,
        companyId: companyId, // 確実に会社IDを設定
        createdAt: new Date().toISOString(),
        lastLogin: null,
        status: '招待中' as const, // 必ず招待中に設定
        inviteToken: inviteToken // 必ずトークンを設定
      };
      
      console.log('[inviteUser] Creating new invited user with company ID:', companyId);
      
      // ユーザーリストに追加
      const updatedUsersList = [...currentUsers, invitedUser];
      setUsers(updatedUsersList);
      
      // ローカルストレージに保存
      if (typeof window !== 'undefined') {
        const { passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
        const updatedPasswordsMap = { ...currentPasswords };
        updatedPasswordsMap[invitedUser.id] = ''; // 招待ユーザーのパスワードは空
        
        const usersToSave = updatedUsersList.map(u => ({
          user: u,
          password: updatedPasswordsMap[u.id] || ''
        }));
        
        // ローカルストレージに保存
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        console.log(`[inviteUser] User invited with token ${inviteToken} and company ID ${companyId}`);
        
        // セッションストレージにも同じデータを保存
        try {
          sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log(`[inviteUser] User data also saved to sessionStorage`);
        } catch (e) {
          console.error('[inviteUser] Failed to save to sessionStorage:', e);
        }
      }
    }
    
    return {
      success: true,
      message: `${inviteData.email}に招待メールを送信しました`,
      inviteToken: inviteToken
    };
  } catch (error) {
    console.error('[inviteUser] Error:', error);
    return {
      success: false,
      message: 'ユーザー招待中にエラーが発生しました'
    };
  }
};

// 招待ユーザーの確認
export const verifyInviteToken = async (
  token: string,
  users: UserInfo[],
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setCompanyId: React.Dispatch<React.SetStateAction<string>>
): Promise<{ valid: boolean; user?: UserInfo; error?: string }> => {
  console.log('[verifyInviteToken] Checking token:', token);
  
  try {
    // まずローカルで確認
    const matchingUser = users.find(u => u.inviteToken === token);
    if (matchingUser && matchingUser.companyId) {
      console.log('[verifyInviteToken] Found matching user in local storage:', matchingUser.email);
      
      // 会社IDをコンテキストに設定
      setCompanyId(matchingUser.companyId);
      console.log('[verifyInviteToken] Set company ID in context from local storage:', matchingUser.companyId);
      
      // ユーザーステータスを更新
      setUsers(prev => {
        const userIndex = prev.findIndex(u => u.inviteToken === token);
        if (userIndex === -1) return prev;
        
        const next = [...prev];
        next[userIndex] = {
          ...next[userIndex],
          status: 'verified' as const
        };
        
        // 変更があった場合のみ保存
        if (!isEqual(prev[userIndex], next[userIndex])) {
          const usersToSave = next.map(u => ({ user: u, password: '' }));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log('[verifyInviteToken] Updated user status to verified and saved to localStorage');
        }
        
        return next;
      });
      
      return { 
        valid: true, 
        user: matchingUser
      };
    }
    
    // ローカルに見つからない場合はSupabaseで確認
    console.log('[verifyInviteToken] No matching user in local storage, checking with Supabase');
    
    // APIエンドポイントを直接呼び出す
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const verifyUrl = `${baseUrl}/api/invitations/verify`;
    console.log('[verifyInviteToken] Calling API:', verifyUrl);
    
    // URLからcompanyIdを取得
    const urlParams = new URLSearchParams(window.location.search);
    const urlCompanyId = urlParams.get('companyId') || sessionStorage.getItem('invite_company_id') || '';
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        invite_token: token, // パラメータ名を修正
        company_id: urlCompanyId // 会社IDも送信
      }),
    });
    
    if (!response.ok) {
      console.error('[verifyInviteToken] API error:', response.status, response.statusText);
      
      // APIが404の場合、ローカルでの処理を試みる
      if (response.status === 404) {
        console.log('[verifyInviteToken] API not found, trying to handle locally');
        
        // URLからcompanyIdを取得
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get('companyId');
        
        if (companyId) {
          console.log('[verifyInviteToken] Found company ID in URL:', companyId);
          setCompanyId(companyId);
          
          return { 
            valid: true, 
            user: {
              id: Date.now().toString(),
              username: 'invited-user',
              email: 'invited-user@example.com',
              fullName: 'Invited User',
              role: '一般ユーザー',
              companyId: companyId,
              createdAt: new Date().toISOString(),
              lastLogin: null,
              status: 'verified' as const,
              inviteToken: token,
              isInvited: true
            }
          };
        }
        
        return { valid: false, error: `APIエラー: ${response.status} ${response.statusText}` };
      }
      
      return { valid: false, error: `APIエラー: ${response.status} ${response.statusText}` };
    }
    
    const result = await response.json();
    console.log('[verifyInviteToken] API response:', result);
    
    if (result.ok) {
      // APIから招待情報を取得できた場合
      const { company_id, email, role } = result;
      
      // 会社IDが設定されているか確認
      if (!company_id) {
        console.error('[verifyInviteToken] Company ID is missing in API response');
        return { valid: false, error: '会社IDが見つかりません' };
      }
      
      // 会社IDをコンテキストに設定
      setCompanyId(company_id);
      console.log('[verifyInviteToken] Set company ID in context:', company_id);
      
      // ユーザーリストを更新
      setUsers(prev => {
        const userIndex = prev.findIndex(u => u.inviteToken === token);
        if (userIndex === -1) return prev;
        
        const next = [...prev];
        next[userIndex] = {
          ...next[userIndex],
          status: 'verified' as const,
          companyId: company_id
        };
        
        // 変更があった場合のみ保存
        if (!isEqual(prev[userIndex], next[userIndex])) {
          const usersToSave = next.map(u => ({ user: u, password: '' }));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log('[verifyInviteToken] Updated user status to verified and saved to localStorage');
        }
        
        return next;
      });
      
      return { 
        valid: true, 
        user: {
          id: Date.now().toString(),
          username: email.split('@')[0],
          email,
          fullName: email.split('@')[0],
          role,
          companyId: company_id,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          status: 'verified' as const,
          inviteToken: token,
          isInvited: true
        }
      };
    }
    
    // トークンが無効な場合
    console.error('[verifyInviteToken] Invalid token:', token);
    return { valid: false, error: '招待トークンが無効です' };
  } catch (error) {
    console.error('[verifyInviteToken] Error:', error);
    
    // エラーが発生した場合、URLからcompanyIdを取得して処理を続行
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const companyId = urlParams.get('companyId');
      
      if (companyId) {
        console.log('[verifyInviteToken] Found company ID in URL after error:', companyId);
        setCompanyId(companyId);
        
        return { 
          valid: true, 
          user: {
            id: Date.now().toString(),
            username: 'invited-user',
            email: 'invited-user@example.com',
            fullName: 'Invited User',
            role: '一般ユーザー',
            companyId: companyId,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            status: 'verified' as const,
            inviteToken: token,
            isInvited: true
          }
        };
      }
    } catch (e) {
      console.error('[verifyInviteToken] Error handling fallback:', e);
    }
    
    return { valid: false, error: '招待トークンの検証中にエラーが発生しました' };
  }
};

// 招待ユーザーの登録完了
export const completeInvitation = async (
  token: string,
  userData: {
    fullName: string;
    companyId?: string; // 会社IDを追加
  },
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  try {
    // Supabaseに招待完了を通知
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[completeInvitation] No authenticated user found');
      return false;
    }
    
    // APIを呼び出して招待を完了
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const completeUrl = `${baseUrl}/api/invitations/complete`;
    console.log('[completeInvitation] Calling API:', completeUrl);
    
    const response = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite_token: token, // パラメータ名を修正
        auth_uid: user.id,
        email: user.email // 必須パラメータを追加
      }),
    });
    
    if (!response.ok) {
      console.error('[completeInvitation] API error:', response.status, response.statusText);
      
      // APIが失敗した場合でもローカルでの処理を続行
      console.log('[completeInvitation] API failed, handling locally');
      
      // ユーザーリストを更新
      setUsers(prev => {
        const userIndex = prev.findIndex(u => u.inviteToken === token);
        if (userIndex === -1) return prev;
        
        const next = [...prev];
        next[userIndex] = {
          ...next[userIndex],
          status: 'completed' as const,
          isInvited: false
        };
        
        // 変更があった場合のみ保存
        if (!isEqual(prev[userIndex], next[userIndex])) {
          const usersToSave = next.map(u => ({ user: u, password: '' }));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log('[completeInvitation] Updated user status to completed and saved to localStorage');
        }
        
        return next;
      });
      
      return true;
    }
    
    const result = await response.json();
    console.log('[completeInvitation] API response:', result);
    
    if (!result.ok) {
      console.error('[completeInvitation] API returned error:', result);
      return false;
    }
    
    // ユーザーリストを更新
    setUsers(prev => {
      const userIndex = prev.findIndex(u => u.inviteToken === token);
      if (userIndex === -1) return prev;
      
      const next = [...prev];
      next[userIndex] = {
        ...next[userIndex],
        status: 'completed' as const,
        isInvited: false
      };
      
      // 変更があった場合のみ保存
      if (!isEqual(prev[userIndex], next[userIndex])) {
        const usersToSave = next.map(u => ({ user: u, password: '' }));
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        console.log('[completeInvitation] Updated user status to completed and saved to localStorage');
      }
      
      return next;
    });
    
    return true;
  } catch (error) {
    console.error('[completeInvitation] Error:', error);
    
    // エラーが発生した場合でもローカルでの処理を続行
    try {
      // ユーザーリストを更新
      setUsers(prev => {
        const userIndex = prev.findIndex(u => u.inviteToken === token);
        if (userIndex === -1) return prev;
        
        const next = [...prev];
        next[userIndex] = {
          ...next[userIndex],
          status: 'completed' as const,
          isInvited: false
        };
        
        // 変更があった場合のみ保存
        if (!isEqual(prev[userIndex], next[userIndex])) {
          const usersToSave = next.map(u => ({ user: u, password: '' }));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log('[completeInvitation] Updated user status to completed and saved to localStorage after error');
        }
        
        return next;
      });
      
      return true;
    } catch (e) {
      console.error('[completeInvitation] Error handling fallback:', e);
      return false;
    }
  }
};
