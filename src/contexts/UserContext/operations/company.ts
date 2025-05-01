import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from '../utils';
import { UserInfo } from '@/utils/api';

// 会社アカウント削除処理
export const deleteCompanyAccount = async (
  currentUser: UserInfo | null,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): Promise<{success: boolean, message?: string}> => {
  // 管理者権限チェック
  if (!currentUser || currentUser.role !== '管理者') {
    return {
      success: false,
      message: '会社アカウントの削除には管理者権限が必要です'
    };
  }

  try {
    const { users: currentUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
    
    // 会社に所属するユーザーを特定
    const companyId = currentUser.companyId;
    const companyUsers = currentUsers.filter(user => user.companyId === companyId);
    
    if (companyUsers.length === 0) {
      return {
        success: false,
        message: '会社に所属するユーザーが見つかりません'
      };
    }
    
    // 会社に所属するユーザーを全て削除
    const updatedUsersList = currentUsers.filter(user => user.companyId !== companyId);
    
    // 会社情報も削除
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kaizen_company_info');
    }
    
    // ユーザー情報を更新
    setUsers(updatedUsersList);
    
    // 現在のユーザーをログアウト
    setCurrentUser(null);
    setIsAuthenticated(false);
    
    // ローカルストレージを更新
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
      
      // パスワード情報も更新
      const { passwords: currentPasswords } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
      const updatedPasswordsMap = { ...currentPasswords };
      
      // 削除されたユーザーのパスワード情報を削除
      companyUsers.forEach(user => {
        delete updatedPasswordsMap[user.id];
      });
      
      setUserPasswords(updatedPasswordsMap);
      
      // 更新されたユーザー情報をローカルストレージに保存
      const usersToSave = updatedUsersList.map(u => ({
        user: u,
        password: updatedPasswordsMap[u.id] || ''
      }));
      
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
      console.log(`[deleteCompanyAccount] Company ${companyId} and all its users deleted.`);
    }
    
    return {
      success: true,
      message: '会社アカウントが正常に削除されました'
    };
  } catch (error) {
    console.error('[deleteCompanyAccount] Error:', error);
    return {
      success: false,
      message: '会社アカウントの削除中にエラーが発生しました'
    };
  }
};
