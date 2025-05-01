import { UserInfo } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';

// ログイン処理
export const login = async (
  usernameOrEmail: string, 
  password: string,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
  const user = currentUsers.find(u => u.username === usernameOrEmail || u.email === usernameOrEmail);

  if (!user || currentPasswords[user.id] !== password) {
    console.error('[Login] Invalid username/email or password.');
    return false;
  }

  const updatedUser: UserInfo = {
    ...user,
    lastLogin: new Date().toISOString(),
    status: 'アクティブ' as const,
    isInvited: false,
    inviteToken: user.status === '招待中' ? '' : user.inviteToken
  };

  setCurrentUser(updatedUser);
  setIsAuthenticated(true);

  const updatedUsersList = currentUsers.map(u => u.id === user.id ? updatedUser : u);
  setUsers(updatedUsersList);
  setUserPasswords(currentPasswords); // パスワードは変更しない

  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    const usersToSave = updatedUsersList.map(u => ({
      user: u,
      password: currentPasswords[u.id] || ''
    }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    console.log('[Login] Login successful, user data updated in localStorage.');
  }
  return true;
};

// NextAuth.jsのセッションからログイン処理を行う関数
export const loginWithSession = async (
  sessionUser: any, 
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  if (!sessionUser?.email) {
    console.error('loginWithSession: セッションユーザーのメールアドレスがありません');
    return false;
  }

  console.log('loginWithSession: セッションユーザー情報:', {
    email: sessionUser.email,
    name: sessionUser.name
  });

  // 最新のユーザーデータを取得
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);

  // Googleアカウントが既に登録されているかチェック
  const existingUser = currentUsers.find(u => u.email === sessionUser.email);

  if (existingUser) {
    // 既存ユーザーの場合
    const updatedUser: UserInfo = {
      ...existingUser,
      fullName: sessionUser.name || existingUser.fullName,
      lastLogin: new Date().toISOString(),
      status: 'アクティブ',
      isInvited: false
    };

    // ユーザーリストを更新
    const updatedUsersList = currentUsers.map(u => 
      u.id === existingUser.id ? updatedUser : u
    );

    // 状態を更新
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    setUsers(updatedUsersList);

    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      const usersToSave = updatedUsersList.map(u => ({
        user: u,
        password: currentPasswords[u.id] || ''
      }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    }

    return true;
  } else {
  // 新規ユーザーの場合
  // ローカルストレージから会社情報を取得
  let companyId = '株式会社サンプル'; // デフォルト値
  let role = '管理者'; // 新規登録ユーザーは管理者
  if (typeof window !== 'undefined') {
    const savedCompanyInfo = localStorage.getItem('kaizen_company_info');
    if (savedCompanyInfo) {
      try {
        const parsedCompanyInfo = JSON.parse(savedCompanyInfo);
        companyId = parsedCompanyInfo.name;
      } catch (error) {
        console.error('Failed to parse company info from localStorage:', error);
      }
    }
  }

    // 新規ユーザーを作成
    const newUser: UserInfo = {
      id: sessionUser.id || Date.now().toString(),
      username: sessionUser.email.split('@')[0],
      email: sessionUser.email,
      fullName: sessionUser.name || sessionUser.email.split('@')[0],
      role: role,
      companyId: companyId,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: 'アクティブ',
      inviteToken: '',
      isInvited: false
    };

    // ユーザーリストを更新
    const updatedUsersList = [...currentUsers, newUser];

    // 状態を更新
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    setUsers(updatedUsersList);

    // パスワードマップを更新
    const updatedPasswordsMap = { ...currentPasswords };
    updatedPasswordsMap[newUser.id] = '';
    setUserPasswords(updatedPasswordsMap);

    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      const usersToSave = updatedUsersList.map(u => ({
        user: u,
        password: updatedPasswordsMap[u.id] || ''
      }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    }

    return true;
  }
};

// ログアウト処理
export const logout = (
  currentUser: UserInfo | null,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
  if (currentUser) {
    const updatedUser = { ...currentUser, status: 'ログアウト中' as const }
    setCurrentUser(null);
    setIsAuthenticated(false);
    const updatedUsersList = currentUsers.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(updatedUsersList);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
      const usersToSave = updatedUsersList.map(u => ({ user: u, password: currentPasswords[u.id] || '' }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
      console.log('[Logout] User logged out, status updated.');
    }
  } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
  }
};

// ユーザー登録処理
export const register = async (
  userData: Omit<UserInfo, 'id' | 'createdAt' | 'lastLogin'>, 
  password: string,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<boolean> => {
  console.log('[register] Start:', userData.email);
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);

  if (currentUsers.some(u => u.username === userData.username)) {
    console.error(`[register] Username ${userData.username} already exists.`);
    return false;
  }
  if (currentUsers.some(u => u.email === userData.email)) {
    console.error(`[register] Email ${userData.email} already exists.`);
    return false;
  }

  const newUser: UserInfo = {
    id: Date.now().toString(),
    ...userData,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    status: 'アクティブ' as const,
    inviteToken: userData.inviteToken || '' // 招待トークンを設定
  };

  const updatedUsersList = [...currentUsers, newUser];
  const updatedPasswordsMap = { ...currentPasswords, [newUser.id]: password };

  setUsers(updatedUsersList);
  setUserPasswords(updatedPasswordsMap);
  setCurrentUser(newUser);
  setIsAuthenticated(true);

  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    const usersToSave = updatedUsersList.map(u => ({ user: u, password: updatedPasswordsMap[u.id] || '' }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    console.log('[register] Registration successful.');
  }
  return true;
};
