import { UserInfo, Employee, UserStatus } from '@/utils/api';
import { UserWithPassword } from './context';
import { isEqual } from '@/utils/deepEqual';

// ローカルストレージのキー
export const USER_STORAGE_KEY = 'kaizen_user_info';
export const USERS_STORAGE_KEY = 'kaizen_users';

// 既存のユーザーデータを修正するユーティリティ関数 (責務分離版)
/**
 * 以前は URL トークンと照合してユーザーデータを補正していたが、
 * 招待完了後に再び「招待中」へ戻ってしまう副作用を起こすためロジックを無効化。
 * そのまま配列を返すだけとする。
 */
export const fixUserData = (users: UserInfo[]): UserInfo[] => users;

// ローカルストレージからユーザー情報を読み込む関数
// 純粋関数として実装し、副作用を最小限に抑える
export const loadUserDataFromLocalStorage = (
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>
): { users: UserInfo[], passwords: Record<string, string> } => {
  console.log('[loadUserData] Starting load from localStorage...');
  let loadedUsers: UserInfo[] = [];
  let loadedPasswords: Record<string, string> = {};

  if (typeof window === 'undefined') {
    return { users: loadedUsers, passwords: loadedPasswords };
  }

  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (savedUsers) {
    try {
      let parsedData = JSON.parse(savedUsers) as UserWithPassword[];
      console.log('[loadUserData] Parsed data from localStorage:', parsedData.length, 'items');

      // データの修正処理
      console.log('[loadUserData] Applying data fixes...');
      const rawUsers = parsedData.map(item => item.user).filter(user => user != null) as UserInfo[];
      
      // 単純に配列を返すだけの fixUserData 関数を使用
      const fixed = fixUserData(rawUsers);

      // 変更が無い場合は保存をスキップ
      if (!isEqual(fixed, rawUsers)) {
        const usersToSave = fixed.map(u => ({
          user: u,
          password: ''
        }));
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
        console.log('ユーザーデータを修正して保存しました');
      } else {
        console.log('ユーザーデータに変更なし、保存をスキップします');
      }
      console.log('[loadUserData] Data fixes applied.');

      loadedUsers = fixed;

      loadedPasswords = parsedData.reduce((acc, item) => {
        if (item.user && item.user.id) {
           acc[item.user.id] = item.password || '';
        }
        return acc;
      }, {} as Record<string, string>);

      setUsers(loadedUsers);
      setUserPasswords(loadedPasswords);
      console.log('[loadUserData] Loaded from localStorage:', loadedUsers.length, 'users');
      
      // 読み込んだユーザーデータを確認（招待中のユーザーのみ）
      const invitedUsers = loadedUsers.filter(user => user.status === '招待中');
      console.log('読み込んだ招待中ユーザー:', invitedUsers.length, '件');
    } catch (error) {
      console.error('[loadUserData] Failed to parse users from localStorage:', error);
    }
  }
  return { users: loadedUsers, passwords: loadedPasswords };
};
