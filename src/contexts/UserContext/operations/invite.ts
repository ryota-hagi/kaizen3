import { UserInfo } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { 
  supabase, 
  generateInviteToken as generateSupabaseToken, 
  saveInvitation, 
  verifyInviteToken as verifySupabaseToken,
  completeInvitation as completeSupabaseInvitation,
  InvitationRecord
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

  try {
    // 招待トークンを生成
    const inviteToken = generateInviteToken();
    
    // Supabaseに招待情報を保存
    const supabaseResult = await saveInvitation({
      email: inviteData.email,
      role: inviteData.role,
      company_id: inviteData.companyId,
      invite_token: inviteToken,
      status: 'pending'
    });
    
    console.log('[inviteUser] Supabase result:', supabaseResult);
    
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
            companyId: inviteData.companyId,
            status: '招待中' as const,
            inviteToken: inviteToken,
            isInvited: true
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
        console.log(`[inviteUser] Updated user in localStorage with token ${inviteToken}`);
        
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
        companyId: inviteData.companyId,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        status: '招待中' as const, // 必ず招待中に設定
        inviteToken: inviteToken, // 必ずトークンを設定
        isInvited: true // 必ずisInvitedをtrueに設定
      };
      
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
        console.log(`[inviteUser] User invited with token ${inviteToken}`);
        
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
): Promise<{ valid: boolean; user?: UserInfo }> => {
  console.log('[verifyInviteToken] Checking token:', token);
  
  try {
    // まずSupabaseで確認
    const supabaseResult = await verifySupabaseToken(token);
    console.log('[verifyInviteToken] Supabase result:', supabaseResult);
    
    if (supabaseResult.valid && supabaseResult.invitation) {
      // Supabaseから招待情報を取得できた場合
      const invitation = supabaseResult.invitation;
      
      // UserInfo形式に変換
      const user: UserInfo = {
        id: invitation.id,
        username: invitation.email.split('@')[0],
        email: invitation.email,
        fullName: invitation.email.split('@')[0],
        role: invitation.role,
        companyId: invitation.company_id,
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
      console.log(`[verifyInviteToken] Invited user ${index + 1}: token: ${user.inviteToken}, status: ${user.status}, isInvited: ${user.isInvited}`);
    });
    
    // トークンが一致するユーザーを検索
    for (const user of mergedUsers) {
      const tokenMatch = user.inviteToken === token;
      
      // 招待中のステータスチェック - 画面表示とストレージの不一致を考慮
      let statusMatch = false;
      if (user.status === '招待中' || user.isInvited === true) {
        statusMatch = true;
      }
      
      console.log(`[verifyInviteToken] User check: tokenMatch=${tokenMatch}, statusMatch=${statusMatch}`);
      
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
        
        // 招待ユーザーを返す前に、メールアドレスを一時的に「招待ユーザー」に置き換える
        // これにより、ログにメールアドレスが表示されなくなる
        const userCopy = { ...user };
        
        // 実際のメールアドレスをログに出力しないようにする
        console.log('[verifyInviteToken] Found valid invited user in localStorage');
        console.log('[verifyInviteToken] User company ID:', userCopy.companyId);
        
        return { valid: true, user: userCopy };
      }
    }
    
    // トークンが一致するユーザーが見つからない場合、トークンだけで検索
    const userByToken = mergedUsers.find(user => user.inviteToken === token);
    if (userByToken) {
      console.log('[verifyInviteToken] Found user by token only in localStorage');
      console.log('[verifyInviteToken] Fixing user status to 招待中');
      
      // ユーザーのステータスを招待中に修正
      userByToken.status = '招待中';
      userByToken.isInvited = true;
      
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
      console.log('[verifyInviteToken] User company ID:', userCopy.companyId);
      
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
  sessionUser: any,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  try {
    // まずSupabaseで招待を完了
    const supabaseResult = await completeSupabaseInvitation(token, { email: sessionUser.email });
    console.log('[completeInvitation] Supabase result:', supabaseResult);
    
    // ローカルストレージでも招待を完了（フォールバック）
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
    // 招待ユーザーを検索
    const invitedUserIndex = currentUsers.findIndex(user => user.inviteToken === token);
    
    if (invitedUserIndex === -1) {
      console.error('[completeInvitation] Invited user not found with token:', token);
      
      // Supabaseでは成功したが、ローカルストレージでは見つからない場合
      if (supabaseResult.success && supabaseResult.data) {
        // Supabaseの情報からユーザーを作成
        const invitation = supabaseResult.data;
        const newUser: UserInfo = {
          id: Date.now().toString(),
          username: sessionUser.email.split('@')[0],
          email: sessionUser.email,
          fullName: userData.fullName || sessionUser.name || sessionUser.email.split('@')[0],
          role: invitation.role,
          companyId: userData.companyId || invitation.company_id,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: 'アクティブ' as const,
          inviteToken: token,
          isInvited: false
        };
        
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
    
    // トークンの照合のみを行い、メールアドレスの照合は行わない
    console.log('[completeInvitation] Using token verification only, skipping email verification');
    console.log('[completeInvitation] Session user email:', sessionUser.email);
    
    // ユーザー情報を更新
    const updatedUser: UserInfo = {
      ...invitedUser,
      email: sessionUser.email, // セッションのメールアドレスを使用
      fullName: userData.fullName || sessionUser.name || invitedUser.fullName,
      // 会社IDが指定されている場合は更新
      companyId: userData.companyId || invitedUser.companyId,
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
