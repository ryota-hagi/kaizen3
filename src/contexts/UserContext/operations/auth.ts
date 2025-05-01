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
