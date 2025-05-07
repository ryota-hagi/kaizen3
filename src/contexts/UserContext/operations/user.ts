import { UserInfo, Employee } from '@/utils/api';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { supabase } from '@/lib/supabaseClient';

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

  // 管理者から一般ユーザーへの変更の場合、他に管理者がいるか確認
  if (currentUser.role === '管理者' && userData.role && userData.role !== '管理者') {
    const adminCount = currentUsers.filter(u => u.role === '管理者' && u.id !== currentUser.id).length;
    if (adminCount === 0) {
      console.error('[updateUserProfile] Cannot change role from admin: no other admin exists.');
      return false;
    }
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

/**
 * 会社内の管理者が0人になる場合に、新しい管理者を自動的に選出する関数
 * @param users 現在のユーザーリスト
 * @param companyId 会社ID
 * @returns 更新されたユーザーリスト
 */
export const ensureAdminExists = (users: UserInfo[], companyId: string): UserInfo[] => {
  // 指定された会社に所属するユーザーのみをフィルタリング
  const companyUsers = users.filter(user => user.companyId === companyId);
  
  // 管理者の数をカウント
  const adminCount = companyUsers.filter(user => user.role === '管理者').length;
  
  // 管理者が存在する場合は何もしない
  if (adminCount > 0) {
    return users;
  }
  
  console.log('[ensureAdminExists] No admin found for company:', companyId);
  
  // 管理者が存在しない場合、新しい管理者を選出
  // まずマネージャーから選出
  const managers = companyUsers.filter(user => user.role === 'マネージャー');
  if (managers.length > 0) {
    // 最初のマネージャーを管理者に昇格
    const newAdmin = managers[0];
    console.log(`[ensureAdminExists] Promoting manager to admin: ${newAdmin.email}`);
    
    return users.map(user => {
      if (user.id === newAdmin.id) {
        return { ...user, role: '管理者' };
      }
      return user;
    });
  }
  
  // マネージャーもいない場合、一般ユーザーから選出
  const regularUsers = companyUsers.filter(user => user.role !== '管理者' && user.role !== 'マネージャー');
  if (regularUsers.length > 0) {
    // 最初の一般ユーザーを管理者に昇格
    const newAdmin = regularUsers[0];
    console.log(`[ensureAdminExists] Promoting regular user to admin: ${newAdmin.email}`);
    
    return users.map(user => {
      if (user.id === newAdmin.id) {
        return { ...user, role: '管理者' };
      }
      return user;
    });
  }
  
  // ユーザーが存在しない場合は元のリストを返す
  return users;
};

// ユーザー削除処理
export const deleteUser = async (
  userId: string,
  currentUser: UserInfo | null,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<{success: boolean, message?: string}> => {
  try {
    if (!currentUser) {
      return {success: false, message: '認証されていません'};
    }
    
    // 自分自身は削除できない
    if (userId === currentUser.id) {
      return {success: false, message: '自分自身を削除することはできません'};
    }
    
    const client = supabase();
    
    // app_usersテーブルからユーザー情報を取得
    const { data: userData, error: userError } = await client
      .from('app_users')
      .select('*')
      .eq('auth_uid', userId)
      .single();
    
    if (userError) {
      console.error('[Supabase] Error getting user:', userError);
      
      // ローカルストレージのユーザー情報を使用
      const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
      
      // 削除対象のユーザーを取得
      const userToDelete = currentUsers.find(u => u.id === userId);
      if (!userToDelete) {
        return {success: false, message: '指定されたユーザーが見つかりません'};
      }
      
      // 管理者ユーザーの場合、他に管理者がいるか確認
      if (userToDelete.role === '管理者') {
        const companyId = userToDelete.companyId;
        const companyUsers = currentUsers.filter(u => u.companyId === companyId);
        const adminCount = companyUsers.filter(u => u.role === '管理者' && u.id !== userId).length;
        
        if (adminCount === 0) {
          // 他の管理者がいない場合、マネージャーまたは一般ユーザーを管理者に昇格させる
          const managers = companyUsers.filter(u => u.role === 'マネージャー' && u.id !== userId);
          const regularUsers = companyUsers.filter(u => u.role !== '管理者' && u.role !== 'マネージャー' && u.id !== userId);
          
          if (managers.length === 0 && regularUsers.length === 0) {
            return {success: false, message: '最後のユーザーは削除できません'};
          }
          
          // 昇格させるユーザーを選択
          const userToPromote = managers.length > 0 ? managers[0] : regularUsers[0];
          console.log(`[deleteUser] Promoting user ${userToPromote.email} to admin role`);
          
          // ユーザーを昇格
          const updatedUsersList = currentUsers.map(u => {
            if (u.id === userToPromote.id) {
              return { ...u, role: '管理者' };
            }
            return u;
          }).filter(u => u.id !== userId);
          
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
            console.log(`[deleteUser] User ${userId} deleted and ${userToPromote.email} promoted to admin.`);
          }
          return {success: true, message: `ユーザーを削除しました。${userToPromote.email}が新しい管理者に設定されました。`};
        }
      }
      
      // 通常のユーザー削除処理
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
      return {success: true, message: 'ユーザーを削除しました'};
    }
    
    // データベースからユーザー情報を取得できた場合
    const userToDelete = userData as unknown as {
      id: string;
      auth_uid: string;
      email: string;
      full_name: string;
      role: string;
      status: string;
      company_id: string;
    };
    
    // 管理者ユーザーの場合、他に管理者がいるか確認
    if (userToDelete.role === '管理者') {
      const { data: adminCount, error: countError } = await client
        .from('app_users')
        .select('id', { count: 'exact' })
        .eq('company_id', userToDelete.company_id)
        .eq('role', '管理者')
        .neq('auth_uid', userId);
      
      if (countError) {
        console.error('[Supabase] Error counting admins:', countError);
        return {success: false, message: '管理者数の確認に失敗しました'};
      }
      
      if (adminCount.length === 0) {
        // 他の管理者がいない場合、マネージャーまたは一般ユーザーを管理者に昇格させる
        const { data: otherUsers, error: otherUsersError } = await client
          .from('app_users')
          .select('*')
          .eq('company_id', userToDelete.company_id)
          .neq('auth_uid', userId)
          .order('role', { ascending: false })
          .limit(1);
        
        if (otherUsersError || otherUsers.length === 0) {
          console.error('[Supabase] Error getting other users:', otherUsersError);
          return {success: false, message: '最後のユーザーは削除できません'};
        }
        
        // 昇格させるユーザーを選択
        const userToPromote = otherUsers[0] as unknown as {
          id: string;
          auth_uid: string;
          email: string;
          full_name: string;
          role: string;
        };
        
        // ユーザーを昇格
        const { error: updateError } = await client
          .from('app_users')
          .update({ role: '管理者' })
          .eq('id', userToPromote.id);
        
        if (updateError) {
          console.error('[Supabase] Error promoting user:', updateError);
          return {success: false, message: 'ユーザーの昇格に失敗しました'};
        }
        
        console.log(`[deleteUser] Promoting user ${userToPromote.email} to admin role`);
      }
    }
    
    // app_usersテーブルからユーザーを削除（または会社IDの紐づけを解除）
    const { error: deleteError } = await client
      .from('app_users')
      .update({ company_id: null, status: '削除済み' })
      .eq('auth_uid', userId);
    
    if (deleteError) {
      console.error('[Supabase] Error deleting user:', deleteError);
      return {success: false, message: 'ユーザーの削除に失敗しました'};
    }
    
    // ローカルストレージのユーザーリストも更新
    const { users: currentUsers, passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
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
    }
    
    return {success: true, message: 'ユーザーを削除しました'};
  } catch (error) {
    console.error('[Supabase] Exception deleting user:', error);
    return {success: false, message: 'ユーザー削除中にエラーが発生しました'};
  }
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

  // 管理者から一般ユーザーへの変更の場合、他に管理者がいるか確認
  if (user.role === '管理者' && userData.role && userData.role !== '管理者') {
    const companyId = user.companyId;
    const companyUsers = currentUsers.filter(u => u.companyId === companyId);
    const adminCount = companyUsers.filter(u => u.role === '管理者' && u.id !== userId).length;
    
    if (adminCount === 0) {
      console.error('[updateUser] Cannot change role from admin: no other admin exists.');
      return false;
    }
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
