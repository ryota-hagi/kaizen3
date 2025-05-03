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
  users: UserInfo[]
): Promise<{ valid: boolean; user?: UserInfo; error?: string }> => {
  console.log('[verifyInviteToken] Checking token:', token);
  
  try {
    // まずSupabaseで確認
    const supabaseResult = await verifySupabaseToken(token);
    console.log('[verifyInviteToken] Supabase result:', supabaseResult);
    
    if (supabaseResult.valid && supabaseResult.invitation) {
      // Supabaseから招待情報を取得できた場合
      const invitation = supabaseResult.invitation;
      
      // 会社IDが設定されているか確認
      if (!invitation.company_id) {
        console.error('[verifyInviteToken] Company ID is missing in Supabase invitation');
      }
      
      // UserInfo形式に変換
      const user: UserInfo = {
        id: invitation.id,
        username: invitation.email.split('@')[0],
        email: invitation.email,
        fullName: invitation.email.split('@')[0],
        role: invitation.role,
        companyId: invitation.company_id, // 会社IDを確実に設定
        createdAt: invitation.created_at,
        lastLogin: null,
        status: '招待中' as const,
        inviteToken: invitation.invite_token,
        isInvited: true
      };
      
      console.log('[verifyInviteToken] Found valid invited user in Supabase');
      console.log('[verifyInviteToken] User company ID:', user.companyId);
      
      return { valid: true, user };
    }
    
    // Supabaseで見つからない場合はローカルストレージで確認
    console.log('[verifyInviteToken] Token not found in Supabase, checking localStorage');
    console.log('[verifyInviteToken] Total users in localStorage:', users.length);
    
    // セッションストレージからもユーザーデータを取得
    let sessionUsers: UserInfo[] = [];
    if (typeof window !== 'undefined' && sessionStorage) {
      try {
        const sessionData = sessionStorage.getItem(USERS_STORAGE_KEY);
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          sessionUsers = parsedData.map((item: any) => item.user);
          console.log('[verifyInviteToken] Found users in sessionStorage:', sessionUsers.length);
        }
      } catch (e) {
        console.error('[verifyInviteToken] Error reading from sessionStorage:', e);
      }
    }
    
    // ローカルストレージとセッションストレージのユーザーをマージ
    const mergedUsers = [...users];
    
    // セッションストレージのユーザーで、ローカルストレージに存在しないものを追加
    sessionUsers.forEach(sessionUser => {
      if (!mergedUsers.some(user => user.id === sessionUser.id)) {
        mergedUsers.push(sessionUser);
      }
    });
    
    // 招待中のユーザーをログに出力（メールアドレスは表示しない）
    const invitedUsers = mergedUsers.filter(user => user.status === '招待中' || user.isInvited === true);
    console.log('[verifyInviteToken] Invited users in localStorage:', invitedUsers.length);
    invitedUsers.forEach((user, index) => {
      console.log(`[verifyInviteToken] Invited user ${index + 1}: token: ${user.inviteToken}, status: ${user.status}, isInvited: ${user.isInvited}, companyId: ${user.companyId || 'not set'}`);
    });
    
    // トークンが一致するユーザーを検索（大文字小文字を区別して比較）
    for (const user of mergedUsers) {
      const tokenMatch = user.inviteToken && user.inviteToken === token;
      
      // 招待中のステータスチェック
      const statusMatch = user.status === '招待中';
      
      // 会社IDが設定されているか確認
      if (!user.companyId) {
        console.warn(`[verifyInviteToken] User with token ${user.inviteToken} has no company ID`);
      }
      
      console.log(`[verifyInviteToken] User check: tokenMatch=${tokenMatch}, statusMatch=${statusMatch}, companyId=${user.companyId || 'not set'}`);
      
      // トークンが一致し、招待中のユーザーを見つけた場合
      if (tokenMatch && statusMatch) {
        console.log('[verifyInviteToken] Found invited user with matching token in localStorage');
        
        // ユーザーのステータスを確認し、必要に応じて修正
        if (user.status !== '招待中') {
          console.log(`[verifyInviteToken] Fixing user status from ${user.status} to 招待中`);
          user.status = '招待中';
          
          // ローカルストレージを更新
          if (typeof window !== 'undefined') {
            try {
              const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
              if (savedUsers) {
                const parsedData = JSON.parse(savedUsers);
                const userToUpdate = parsedData.find((item: any) => 
                  item.user && item.user.id === user.id
                );
                
                if (userToUpdate) {
                  userToUpdate.user.status = '招待中';
                  userToUpdate.user.isInvited = true;
                  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                  console.log('[verifyInviteToken] Updated user status in localStorage');
                  
                  // セッションストレージも更新
                  try {
                    sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                    console.log('[verifyInviteToken] Also updated sessionStorage');
                  } catch (e) {
                    console.error('[verifyInviteToken] Failed to update sessionStorage:', e);
                  }
                }
              }
            } catch (e) {
              console.error('[verifyInviteToken] Error updating localStorage:', e);
            }
          }
        }
        
        if (user.isInvited !== true) {
          console.log(`[verifyInviteToken] Setting isInvited flag to true`);
          user.isInvited = true;
          
          // ローカルストレージを更新
          if (typeof window !== 'undefined') {
            try {
              const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
              if (savedUsers) {
                const parsedData = JSON.parse(savedUsers);
                const userToUpdate = parsedData.find((item: any) => 
                  item.user && item.user.id === user.id
                );
                
                if (userToUpdate) {
                  userToUpdate.user.isInvited = true;
                  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                  console.log('[verifyInviteToken] Updated isInvited flag in localStorage');
                  
                  // セッションストレージも更新
                  try {
                    sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                    console.log('[verifyInviteToken] Also updated sessionStorage');
                  } catch (e) {
                    console.error('[verifyInviteToken] Failed to update sessionStorage:', e);
                  }
                }
              }
            } catch (e) {
              console.error('[verifyInviteToken] Error updating localStorage:', e);
            }
          }
        }
        
    // 会社IDが設定されていない場合はエラーとする
    // 招待ユーザーは必ず会社IDを持っている必要がある
    if (!user.companyId || user.companyId.trim() === '') {
      console.error('[verifyInviteToken] No company ID found for user with token:', token);
      return { valid: false, error: '招待ユーザーの会社情報が見つかりません。' };
    }
        
        // 招待ユーザーを返す前に、メールアドレスを一時的に「招待ユーザー」に置き換える
        // これにより、ログにメールアドレスが表示されなくなる
        const userCopy = { ...user };
        
        // 実際のメールアドレスをログに出力しないようにする
        console.log('[verifyInviteToken] Found valid invited user in localStorage');
        console.log('[verifyInviteToken] User company ID:', userCopy.companyId || 'not set');
        
        return { valid: true, user: userCopy };
      }
    }
    
    // トークンが一致するユーザーが見つからない場合、トークンのみで検索（大文字小文字を区別して比較）
    const userByToken = mergedUsers.find(user => 
      user.inviteToken && user.inviteToken === token
    );
    
    if (userByToken) {
      console.log('[verifyInviteToken] Found user by token only in localStorage');
      console.log('[verifyInviteToken] Fixing user status to 招待中');
      
      // ユーザーのステータスを招待中に修正
      userByToken.status = '招待中';
      userByToken.isInvited = true;
      
      // 会社IDが設定されているか確認
      if (!userByToken.companyId || userByToken.companyId.trim() === '') {
        console.log('[verifyInviteToken] No company ID found for user, searching for company ID from other users');
        
        // 他のユーザーから会社IDを取得
        const otherUser = mergedUsers.find(u => u.companyId && u.companyId.trim() !== '');
        if (otherUser) {
          userByToken.companyId = otherUser.companyId;
          console.log(`[verifyInviteToken] Setting company ID to ${otherUser.companyId} from other user`);
        } else {
          console.warn(`[verifyInviteToken] No company ID found from other users`);
        }
      }
      
      // ローカルストレージを更新
      if (typeof window !== 'undefined') {
        try {
          const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
          if (savedUsers) {
            const parsedData = JSON.parse(savedUsers);
            const userToUpdate = parsedData.find((item: any) => 
              item.user && item.user.id === userByToken.id
            );
            
            if (userToUpdate) {
              userToUpdate.user.status = '招待中';
              userToUpdate.user.isInvited = true;
              if (userByToken.companyId) {
                userToUpdate.user.companyId = userByToken.companyId;
              }
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
              console.log('[verifyInviteToken] Updated user status in localStorage');
              
              // セッションストレージも更新
              try {
                sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                console.log('[verifyInviteToken] Also updated sessionStorage');
              } catch (e) {
                console.error('[verifyInviteToken] Failed to update sessionStorage:', e);
              }
            }
          }
        } catch (e) {
          console.error('[verifyInviteToken] Error updating localStorage:', e);
        }
      }
      
      // 招待ユーザーを返す前に、メールアドレスを一時的に「招待ユーザー」に置き換える
      const userCopy = { ...userByToken };
      
      // 実際のメールアドレスをログに出力しないようにする
      console.log('[verifyInviteToken] Found valid invited user by token in localStorage');
      console.log('[verifyInviteToken] User company ID:', userCopy.companyId || 'not set');
      
      return { valid: true, user: userCopy };
    }
    
    console.log('[verifyInviteToken] No invited user found with token:', token);
    return { valid: false };
  } catch (error) {
    console.error('[verifyInviteToken] Error:', error);
    return { valid: false };
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
    // まずSupabaseで招待を完了
    const supabaseResult = await completeSupabaseInvitation(token, { email: userData.fullName });
    console.log('[completeInvitation] Supabase result:', supabaseResult);
    
    // ローカルストレージでも招待を完了（フォールバック）
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
    // 招待ユーザーを検索（大文字小文字を区別して比較）
    const invitedUserIndex = currentUsers.findIndex(user => 
      user.inviteToken && user.inviteToken === token
    );
    
    if (invitedUserIndex === -1) {
      console.error('[completeInvitation] Invited user not found with token:', token);
      
      // Supabaseでは成功したが、ローカルストレージでは見つからない場合
      if (supabaseResult.success && supabaseResult.data) {
        // Supabaseの情報からユーザーを作成
        const invitation = supabaseResult.data;
        
        // 会社IDを確認
        let companyId = userData.companyId || invitation.company_id;
        if (!companyId || companyId.trim() === '') {
          console.log('[completeInvitation] No company ID found, searching for company ID from other users');
          
          // 他のユーザーから会社IDを取得
          const otherUser = currentUsers.find(u => u.companyId && u.companyId.trim() !== '');
          if (otherUser) {
            companyId = otherUser.companyId;
            console.log(`[completeInvitation] Using company ID ${companyId} from other user`);
          } else {
            console.error('[completeInvitation] Company ID is missing in both userData and Supabase invitation');
            companyId = 'default-company-id'; // デフォルト値を設定
          }
        }
        
        const newUser: UserInfo = {
          id: Date.now().toString(),
          username: userData.fullName.split('@')[0],
          email: userData.fullName,
          fullName: userData.fullName,
          role: invitation.role,
          companyId: companyId, // 確実に会社IDを設定
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: 'アクティブ' as const,
          inviteToken: token,
          isInvited: false
        };
        
        console.log('[completeInvitation] Creating new user with company ID:', companyId);
        
        // ユーザーリストに追加
        const updatedUsersList = [...currentUsers, newUser];
        setUsers(updatedUsersList);
        setCurrentUser(newUser);
        setIsAuthenticated(true);
        
        // ローカルストレージに保存
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
          
          const { passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
          const usersToSave = updatedUsersList.map(u => ({
            user: u,
            password: currentPasswords[u.id] || ''
          }));
          
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log('[completeInvitation] Created new user from Supabase data:', newUser.email);
          
          // セッションストレージにも同じデータを保存
          try {
            sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
            sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
            console.log('[completeInvitation] User data also saved to sessionStorage');
          } catch (e) {
            console.error('[completeInvitation] Failed to save to sessionStorage:', e);
          }
        }
        
        return true;
      }
      
      return false;
    }
    
    const invitedUser = currentUsers[invitedUserIndex];
    
    // 会社IDを確認（招待ユーザーの会社IDを優先）
    let companyId = invitedUser.companyId || userData.companyId;
    if (!companyId || companyId.trim() === '') {
      console.error('[completeInvitation] No company ID found for invited user');
      return false;
    }
    
    // 会社IDが一致しない場合はエラー
    if (userData.companyId && invitedUser.companyId && userData.companyId !== invitedUser.companyId) {
      console.error('[completeInvitation] Company ID mismatch:', userData.companyId, 'vs', invitedUser.companyId);
      return false;
    }
    
    // トークンの照合のみを行い、メールアドレスの照合は行わない
    console.log('[completeInvitation] Using token verification only, skipping email verification');
    
    // ユーザー情報を更新
    const updatedUser: UserInfo = {
      ...invitedUser,
      email: userData.fullName,
      fullName: userData.fullName,
      companyId: companyId, // 確実に会社IDを設定
      status: 'アクティブ' as const,
      isInvited: false,
      lastLogin: new Date().toISOString()
    };
    
    console.log('[completeInvitation] Updating user with company ID:', updatedUser.companyId);
    console.log('[completeInvitation] Updating user email to:', updatedUser.email);
    
    // ユーザーリストを更新
    const updatedUsersList = [...currentUsers];
    updatedUsersList[invitedUserIndex] = updatedUser;
    
    setUsers(updatedUsersList);
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      
      const { passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
      const usersToSave = updatedUsersList.map(u => ({
        user: u,
        password: currentPasswords[u.id] || ''
      }));
      
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
      console.log('[completeInvitation] Invitation completed for user:', updatedUser.email);
      
      // セッションストレージにも同じデータを保存
      try {
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        console.log('[completeInvitation] User data also saved to sessionStorage');
      } catch (e) {
        console.error('[completeInvitation] Failed to save to sessionStorage:', e);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[completeInvitation] Error:', error);
    return false;
  }
};
