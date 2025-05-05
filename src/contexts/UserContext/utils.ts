import { UserInfo, Employee, UserStatus } from '@/utils/api';
import { UserWithPassword } from './context';
import { isEqual } from '@/utils/deepEqual';

// ローカルストレージのキー
export const USER_STORAGE_KEY = 'kaizen_user_info';
export const USERS_STORAGE_KEY = 'kaizen_users';

// 既存のユーザーデータを修正するユーティリティ関数 (責務分離版)
export const fixUserData = (
  users: UserInfo[],
  urlToken: string | null
): UserInfo[] => {
  console.log('[fixUserData] Starting fix for users:', users.length, 'with urlToken:', urlToken);
  return users.map(u => {
    // URLトークンがない、またはユーザーにトークンがない、またはトークンが一致しない場合は触らない
    if (!urlToken || !u.inviteToken || u.inviteToken !== urlToken) {
      // console.log(`[fixUserData] Skipping user ${u.email}: No match or no token.`);
      // isInvitedフラグが残っている場合のみリセット
      if (u.isInvited === true) {
          console.log(`[fixUserData] Resetting isInvited for ${u.email} (no matching token).`);
          return { ...u, isInvited: false };
      }
      return u;
    }

    // トークンが一致する場合：
    // 既に '招待中' または 'アクティブ' など完了状態なら触らない
    if (u.status === '招待中' || u.status === 'アクティブ' || u.status === 'completed' || u.status === 'verified') {
       // console.log(`[fixUserData] Skipping user ${u.email}: Status is already ${u.status}.`);
       // isInvitedフラグがtrueでステータスが招待中以外ならリセット
       if (u.isInvited === true && u.status !== '招待中') {
           console.log(`[fixUserData] Resetting isInvited for ${u.email} (status is ${u.status}).`);
           return { ...u, isInvited: false };
       }
       return u;
    }

    // トークンが一致し、ステータスが未設定または上記以外の場合のみ '招待中' に設定
    console.log(`[fixUserData] Setting status to '招待中' for ${u.email} (token matched, status was ${u.status}).`);
    return { ...u, status: '招待中' as UserStatus, isInvited: true }; // isInvitedもtrueにする
  });
};

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

      // --- fixUserData ロジックをここに統合 ---
      console.log('[loadUserData] Applying data fixes...');
      let urlToken = '';
      let urlCompanyId = '';
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        urlToken = urlParams.get('token') || '';
        urlCompanyId = urlParams.get('companyId') || '';
        
        // セッションストレージと localStorage からも取得（バックアップ）
        if (!urlToken) {
          urlToken = sessionStorage.getItem('invite_token') || localStorage.getItem('invite_token') || '';
        }
        if (!urlCompanyId) {
          urlCompanyId = sessionStorage.getItem('invite_company_id') || localStorage.getItem('invite_company_id') || '';
        }
      }

      const rawUsers = parsedData.map(item => item.user).filter(user => user != null) as UserInfo[];
      const fixed = fixUserData(rawUsers, urlToken);

      // ✅ 変更が無い場合 save をスキップ
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
      
      // 招待中のユーザーを確認（isInvitedフラグも考慮）
      const invitedUsersAfterProcessing = loadedUsers.filter(user => user.status === '招待中');
      console.log('処理後の招待中ユーザー:', invitedUsersAfterProcessing.length, '件');
      
      // 招待中のユーザーが見つからない場合、元のデータを再確認
      if (invitedUsersAfterProcessing.length === 0 && parsedData.length > 0) {
        console.log('招待中のユーザーが見つかりません。元のデータを再確認します。');
        
        // 元のデータから招待中のユーザーを検索
        const originalInvitedUsers = parsedData.filter((item: any) => 
          item.user && item.user.status === '招待中'
        );
        
        console.log('元のデータの招待中ユーザー:', originalInvitedUsers.length, '件');
      } else {
        invitedUsersAfterProcessing.forEach((user, index) => {
          console.log(`処理後の招待中ユーザー${index}:`, {
            id: user.id,
            email: user.email,
            inviteToken: user.inviteToken,
            status: user.status,
            isInvited: user.isInvited,
            companyId: user.companyId || 'not set'
          });
        });
      }

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
