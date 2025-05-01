import { UserInfo, Employee } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';

// ユーザープロフィールの更新
export const updateUserProfile = async (
  userData: Partial<UserInfo>,
  currentUser: UserInfo | null,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<boolean> => {
  if (!currentUser) return false;
  console.log('[updateUserProfile] Start:', currentUser.email);
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);

  if (userData.username && userData.username !== currentUser.username && currentUsers.some(u => u.username === userData.username)) {
    console.error(`[updateUserProfile] Username ${userData.username} already exists.`);
    return false;
  }
  if (userData.email && userData.email !== currentUser.email && currentUsers.some(u => u.email === userData.email)) {
    console.error(`[updateUserProfile] Email ${userData.email} already exists.`);
    return false;
  }

  const updatedUser = { ...currentUser, ...userData };
  setCurrentUser(updatedUser);

  const updatedUsersList = currentUsers.map(u => u.id === currentUser.id ? updatedUser : u);
  setUsers(updatedUsersList);

  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    const usersToSave = updatedUsersList.map(u => ({ user: u, password: currentPasswords[u.id] || '' }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    console.log('[updateUserProfile] Profile updated.');
  }
  return true;
};

// IDでユーザーを取得
export const getUserById = (id: string, users: UserInfo[]): UserInfo | undefined => {
  return users.find(u => u.id === id);
};

// 既存の招待ユーザーを削除し、新しいユーザーデータを初期化する関数
export const clearInvitedUsers = (
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
) => {
  if (typeof window === 'undefined') return;
  
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (!savedUsers) return;
  
  try {
    const parsedData = JSON.parse(savedUsers);
    console.log('招待ユーザー削除前のユーザーデータ:', parsedData.length, '件');
    
    // 招待中ユーザーを除外したデータを作成（ただし、管理者は保持する）
    const filteredData = parsedData.filter((item: {user: any; password: string}) => {
      if (!item.user) return true;
      // 管理者は常に保持する
      if (item.user.role === '管理者') return true;
      // 招待中でないユーザーも保持する
      return item.user.status !== '招待中';
    });
    
    console.log('招待ユーザー削除後のユーザーデータ:', filteredData.length, '件');
    
    // 修正したデータを保存
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filteredData));
    console.log('招待ユーザーを削除しました');
    
    // 状態を更新
    const filteredUsers = filteredData.map((item: {user: any}) => item.user).filter((user: any) => user != null);
    setUsers(filteredUsers);
    
    const filteredPasswords = filteredData.reduce((acc: Record<string, string>, item: {user: any; password: string}) => {
      if (item.user && item.user.id) {
        acc[item.user.id] = item.password || '';
      }
      return acc;
    }, {});
    setUserPasswords(filteredPasswords);
    
    return filteredData;
  } catch (error) {
    console.error('招待ユーザーの削除に失敗しました:', error);
    return null;
  }
};

// ユーザー削除処理
export const deleteUser = async (
  userId: string,
  currentUser: UserInfo | null,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<{success: boolean, message?: string}> => {
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
  
  // 自分自身は削除できない
  if (currentUser && userId === currentUser.id) {
    return {success: false, message: '自分自身を削除することはできません'};
  }
  
  // 削除対象のユーザーを取得
  const userToDelete = currentUsers.find(u => u.id === userId);
  if (!userToDelete) {
    return {success: false, message: '指定されたユーザーが見つかりません'};
  }
  
  // 管理者ユーザーの場合、他に管理者がいるか確認
  if (userToDelete.role === '管理者') {
    const adminCount = currentUsers.filter(u => u.role === '管理者').length;
    if (adminCount <= 1) {
      return {success: false, message: '最後の管理者は削除できません。他のユーザーを管理者に設定してから削除してください'};
    }
  }

  const updatedUsersList = currentUsers.filter(u => u.id !== userId);
  const updatedPasswordsMap = { ...currentPasswords };
  delete updatedPasswordsMap[userId];

  setUsers(updatedUsersList);
  setUserPasswords(updatedPasswordsMap);

  if (typeof window !== 'undefined') {
    const usersToSave = updatedUsersList.map(u => ({
      user: u,
      password: updatedPasswordsMap[u.id] || ''
    }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    console.log(`[deleteUser] User ${userId} deleted.`);
  }
  return {success: true};
};

// パスワード変更処理
export const changePassword = async (
  currentPassword: string, 
  newPassword: string,
  currentUser: UserInfo | null,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<boolean> => {
  if (!currentUser) return false;
  const { passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);

  if (currentPasswords[currentUser.id] !== currentPassword) {
    console.error('[changePassword] Current password does not match.');
    return false;
  }

  const updatedPasswordsMap = { ...currentPasswords, [currentUser.id]: newPassword };
  setUserPasswords(updatedPasswordsMap); // state更新

  if (typeof window !== 'undefined') {
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords); // 最新のユーザーリストを取得
    const usersToSave = currentUsers.map(u => ({
      user: u,
      password: updatedPasswordsMap[u.id] || ''
    }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    console.log('[changePassword] Password changed successfully.');
  }
  return true;
};

// 管理者用ユーザー編集関数
export const updateUser = async (
  userId: string, 
  userData: Partial<UserInfo>,
  currentUser: UserInfo | null,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<boolean> => {
  console.log('[updateUser] Start:', userId);
  const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);

  const userIndex = currentUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    console.error(`[updateUser] User ID ${userId} not found.`);
    return false;
  }
  const user = currentUsers[userIndex];

  // 重複チェック
  if (userData.username && userData.username !== user.username && currentUsers.some(u => u.username === userData.username && u.id !== userId)) {
    console.error(`[updateUser] Username ${userData.username} already exists.`);
    return false;
  }
  if (userData.email && userData.email !== user.email && currentUsers.some(u => u.email === userData.email && u.id !== userId)) {
    console.error(`[updateUser] Email ${userData.email} already exists.`);
    return false;
  }

  const updatedUser = { ...user, ...userData };
  const updatedUsersList = [...currentUsers];
  updatedUsersList[userIndex] = updatedUser;

  setUsers(updatedUsersList); // state更新

  if (currentUser && currentUser.id === userId) {
    setCurrentUser(updatedUser); // 現在のユーザーも更新
    if (typeof window !== 'undefined') {
       localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  }

  if (typeof window !== 'undefined') {
    const usersToSave = updatedUsersList.map(u => ({
      user: u,
      password: currentPasswords[u.id] || ''
    }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
    console.log(`[updateUser] User ${userId} updated successfully.`);
  }
  return true;
};

// 従業員一覧を取得する関数
export const getEmployees = (): Employee[] => {
  // マイページの従業員情報をローカルストレージから取得
  if (typeof window !== 'undefined') {
    const EMPLOYEES_STORAGE_KEY = 'kaizen_employees';
    const savedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY);

    if (savedEmployees) {
      try {
        return JSON.parse(savedEmployees);
      } catch (error) {
        console.error('Failed to parse employees from localStorage:', error);
      }
    }
  }

  // ローカルストレージにデータがない場合はデフォルト値を返す
  return [
    { id: '1', name: '山田太郎', position: '営業部長', department: '営業部', hourlyRate: 3000 },
    { id: '2', name: '佐藤花子', position: '経理担当', department: '管理部', hourlyRate: 2500 },
    { id: '3', name: '鈴木一郎', position: '倉庫管理者', department: '物流部', hourlyRate: 2000 }
  ];
};
