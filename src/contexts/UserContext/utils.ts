import { UserInfo, Employee } from '@/utils/api';
import { UserWithPassword } from './context';
import { isEqual } from '@/utils/deepEqual';

// ローカルストレージのキー
export const USER_STORAGE_KEY = 'kaizen_user_info';
export const USERS_STORAGE_KEY = 'kaizen_users';

// 既存のユーザーデータを修正するユーティリティ関数
export const fixUserData = (parsedData: any[]): any[] => {
  console.log('修正前のユーザーデータ:', parsedData.length, '件');
  
  // URLパラメータから招待トークンを取得（存在する場合）
  let urlToken = '';
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    urlToken = urlParams.get('token') || '';
  }
  
  // 各ユーザーのinviteTokenプロパティを確認し、必要に応じて修正
  const fixedData = parsedData.map((item: {user: any; password: string}) => {
    if (!item.user) return item;
    
    // ユーザーデータを直接修正
    const user = { ...item.user };
    
    // inviteTokenプロパティが存在しない場合は追加
    if (user.inviteToken === undefined || user.inviteToken === null) {
      console.log(`ユーザー ${user.email} にinviteTokenプロパティを追加`);
      user.inviteToken = '';
    }
    
    // URLトークンと一致するユーザーを招待中に設定
    if (urlToken && user.inviteToken === urlToken && user.status !== '招待中') {
      console.log(`ユーザー ${user.email} のステータスを招待中に変更（URLトークン一致）`);
      user.status = '招待中';
      user.isInvited = true; // isInvitedフラグも設定
    }
    
    // statusが'招待中'でinviteTokenが空の場合、新しいトークンを生成
    if (user.status === '招待中' && (!user.inviteToken || user.inviteToken === '')) {
      user.inviteToken = Math.random().toString(36).substring(2, 10);
      user.isInvited = true; // isInvitedフラグも設定
      console.log(`ユーザー ${user.email} のトークンを生成: ${user.inviteToken}`);
    }
    
    // isInvitedがtrueの場合、statusを'招待中'に設定
    if (user.isInvited === true && user.status !== '招待中') {
      user.status = '招待中';
      console.log(`ユーザー ${user.email} のステータスを招待中に変更（isInvitedフラグに基づく）`);
    }
    
    // 招待中でないユーザーでもトークンが空の場合、空文字列を設定
    if ((!user.inviteToken || user.inviteToken === '') && user.status !== '招待中') {
      user.inviteToken = '';
      console.log(`ユーザー ${user.email} のトークンを空に設定`);
    }
    
    return {
      user: user,
      password: item.password || ''
    };
  });
  
  // 修正後のデータを確認（招待中のユーザーのみ）
  const invitedUsers = fixedData.filter((item: {user: any}) => 
    item.user && (item.user.status === '招待中' || item.user.isInvited === true)
  );
  console.log('修正後の招待中ユーザー:', invitedUsers.length, '件');
  
  // 全ユーザー数と招待中ユーザー数の差分を確認
  console.log('全ユーザー数:', fixedData.length, '件');
  console.log('招待中ユーザー数:', invitedUsers.length, '件');
  console.log('差分:', fixedData.length - invitedUsers.length, '件');
  
  // 招待中のユーザーの詳細を表示
  invitedUsers.forEach((item: {user: any}, index: number) => {
    console.log(`招待中ユーザー${index}:`, {
      id: item.user.id,
      email: item.user.email,
      inviteToken: item.user.inviteToken || '',
      status: item.user.status,
      isInvited: item.user.isInvited,
      companyId: item.user.companyId || 'not set'
    });
  });
  
  // ユーザー管理一覧に表示されているユーザーと照合リストの整合性を確保
  // 招待中のユーザーには必ずトークンを設定
  fixedData.forEach((item: {user: any}) => {
    if (item.user && (item.user.status === '招待中' || item.user.isInvited === true)) {
      // 招待中のユーザーには必ずトークンを設定
      if (!item.user.inviteToken || item.user.inviteToken === '') {
        item.user.inviteToken = Math.random().toString(36).substring(2, 10);
        console.log(`招待中ユーザーのトークンを生成: ${item.user.inviteToken}`);
      }
      // 招待中のユーザーには必ずisInvitedフラグを設定
      item.user.isInvited = true;
      // 招待中のユーザーには必ずstatusを設定
      item.user.status = '招待中';
    }
  });
  
  return fixedData;
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
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        urlToken = urlParams.get('token') || '';
      }

      parsedData = parsedData.map((item: {user: any; password: string}) => {
        if (!item.user) return item;
        const user = { ...item.user };

        // inviteTokenプロパティが存在しない場合は追加
        if (user.inviteToken === undefined || user.inviteToken === null) {
          user.inviteToken = '';
        }

        // URLトークンと一致するユーザーを招待中に設定
        if (urlToken && user.inviteToken && user.inviteToken.toLowerCase() === urlToken.toLowerCase() && user.status !== '招待中') {
          console.log(`[fixUserData Integrated] Setting status to '招待中' for ${user.email} based on URL token match.`);
          user.status = '招待中';
          user.isInvited = true;
        }

        // statusが'招待中'でinviteTokenが空の場合、新しいトークンを生成
        if (user.status === '招待中' && (!user.inviteToken || user.inviteToken === '')) {
          user.inviteToken = Math.random().toString(36).substring(2, 10);
          user.isInvited = true; // isInvitedフラグも設定
          console.log(`[fixUserData Integrated] Generating token for invited user ${user.email}: ${user.inviteToken}`);
        }

        // isInvited フラグが true の場合、常にリセットする
        if (user.isInvited === true) {
          console.log(`[fixUserData Integrated] Resetting isInvited flag for ${user.email}.`);
          user.status = 'アクティブ';
          user.isInvited = false; // 招待フラグを常にリセット
        }

        // 招待中でないユーザーでもトークンが空の場合、空文字列を設定
        if ((!user.inviteToken || user.inviteToken === '') && user.status !== '招待中') {
          user.inviteToken = '';
        }

        return { user: user, password: item.password || '' };
      });
      console.log('[loadUserData] Data fixes applied.');
      // --- fixUserData ロジック統合 ここまで ---

      // 招待中のユーザーを確認し、ステータスとトークンを正しく設定
      parsedData.forEach(item => {
        if (!item.user) return;
        
        // ステータスが招待中またはisInvitedがtrueの場合、トークンが必ず設定されていることを確認
        if (item.user.status === '招待中' || item.user.isInvited === true) {
          if (!item.user.inviteToken || item.user.inviteToken === '') {
            item.user.inviteToken = Math.random().toString(36).substring(2, 10);
            console.log(`招待中ユーザーのトークンを生成: ${item.user.inviteToken}`);
          }
          // 招待中のユーザーには必ずisInvitedフラグを設定
          item.user.isInvited = true;
          // 招待中のユーザーには必ずstatusを設定
          item.user.status = '招待中';
        }
      });
      
      // 修正したデータを保存（無限ループ防止のため、変更があった場合のみ保存）
      // 保存されたデータを解析
      let originalData: any[] = [];
      try {
        originalData = JSON.parse(savedUsers);
      } catch (e) {
        console.error('元のデータの解析に失敗しました:', e);
      }
      
      // データの変更を検出
      const hasChanges = !isEqual(originalData, parsedData);
      
      // 変更があった場合のみ保存
      if (hasChanges) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
        console.log('ユーザーデータを修正して保存しました');
      } else {
        console.log('ユーザーデータに変更なし、保存をスキップします');
      }

      loadedUsers = parsedData.map(item => {
        const user = item.user;
        if (!user) return null;
        
        // ユーザー管理一覧と検索で使用するステータスを一致させる
        // ユーザー管理一覧に表示されている「招待中」ステータスを優先する
        if (user.status === '招待中' || user.isInvited === true) {
          user.status = '招待中';
          
          // 招待中のユーザーには必ずトークンを設定
          if (!user.inviteToken || user.inviteToken === '') {
            user.inviteToken = Math.random().toString(36).substring(2, 10);
            console.log(`ユーザー ${user.email} のトークンを生成: ${user.inviteToken}`);
          }
          
          // isInvitedフラグを必ず設定
          user.isInvited = true;
          console.log(`ユーザー ${user.email} のisInvitedフラグを設定`);
        } else if (!user.status) {
          // ステータスが設定されていない場合はデフォルト値を設定
          user.status = user.lastLogin ? 'ログアウト中' : 'アクティブ';
        }
        
        // inviteTokenプロパティが確実に存在することを確認
        if (user.inviteToken === undefined || user.inviteToken === null) {
          user.inviteToken = '';
        }
        
    // 会社IDが設定されていない場合は他のユーザーから取得
    if (user.companyId === undefined || user.companyId === null || user.companyId === '') {
      // 他のユーザーから会社IDを取得
      const otherUser = parsedData.find((item: any) => 
        item.user && item.user.companyId && item.user.companyId.trim() !== ''
      );
      
      if (otherUser && otherUser.user) {
        user.companyId = otherUser.user.companyId;
        console.log(`ユーザー ${user.email} の会社IDを他のユーザーから設定: ${user.companyId}`);
      } else {
        user.companyId = '';
        console.log(`ユーザー ${user.email} の会社IDを設定できませんでした`);
      }
    }
        
        return user;
      }).filter(user => user != null) as UserInfo[]; // nullを除外
      
      // 招待中のユーザーを再確認（isInvitedフラグも考慮）
      const invitedUsersAfterProcessing = loadedUsers.filter(user => user.status === '招待中' || user.isInvited === true);
      console.log('処理後の招待中ユーザー:', invitedUsersAfterProcessing.length, '件');
      
      // 招待中のユーザーが見つからない場合、元のデータを再確認
      if (invitedUsersAfterProcessing.length === 0 && parsedData.length > 0) {
        console.log('招待中のユーザーが見つかりません。元のデータを再確認します。');
        
        // 元のデータから招待中のユーザーを検索
        const originalInvitedUsers = parsedData.filter((item: any) => 
          item.user && (item.user.status === '招待中' || item.user.isInvited === true)
        );
        
        console.log('元のデータの招待中ユーザー:', originalInvitedUsers.length, '件');
        
        if (originalInvitedUsers.length > 0) {
          console.log('元のデータに招待中ユーザーが見つかりました。データを修正します。');
          
          // 招待中ユーザーを追加
          originalInvitedUsers.forEach((item: any) => {
            const invitedUser = item.user;
            
            // 既に同じIDのユーザーが存在するか確認
            const existingUserIndex = loadedUsers.findIndex(u => u.id === invitedUser.id);
            
            if (existingUserIndex >= 0) {
              // 既存のユーザーを更新
              console.log(`既存のユーザーを招待中に更新: ${invitedUser.email}`);
              loadedUsers[existingUserIndex].status = '招待中';
              loadedUsers[existingUserIndex].isInvited = true;
              loadedUsers[existingUserIndex].inviteToken = invitedUser.inviteToken || Math.random().toString(36).substring(2, 10);
              
              // 会社IDを設定（存在する場合のみ）
              if (invitedUser.companyId) {
                loadedUsers[existingUserIndex].companyId = invitedUser.companyId;
              }
            } else {
              // 新しいユーザーとして追加
              console.log(`招待中ユーザーを追加: ${invitedUser.email}`);
              invitedUser.status = '招待中';
              invitedUser.isInvited = true;
              if (!invitedUser.inviteToken || invitedUser.inviteToken === '') {
                invitedUser.inviteToken = Math.random().toString(36).substring(2, 10);
              }
              
              // 会社IDが設定されていない場合は空文字列を設定
              if (invitedUser.companyId === undefined || invitedUser.companyId === null) {
                invitedUser.companyId = '';
              }
              
              loadedUsers.push(invitedUser);
            }
          });
          
          // 状態を更新
          setUsers(loadedUsers);
          
          // パスワードマップを更新
          originalInvitedUsers.forEach((item: any) => {
            if (item.user && item.user.id) {
              loadedPasswords[item.user.id] = item.password || '';
            }
          });
          setUserPasswords(loadedPasswords);
          
          // 再度招待中のユーザーを確認
          const fixedInvitedUsers = loadedUsers.filter(user => user.status === '招待中' || user.isInvited === true);
          console.log('修正後の招待中ユーザー:', fixedInvitedUsers.length, '件');
          
          fixedInvitedUsers.forEach((user, index) => {
            console.log(`修正後の招待中ユーザー${index}:`, {
              id: user.id,
              email: user.email,
              inviteToken: user.inviteToken,
              status: user.status,
              isInvited: user.isInvited,
              companyId: user.companyId || 'not set'
            });
          });
          
          // 修正したデータを保存
          const usersToSave = loadedUsers.map(u => ({
            user: u,
            password: loadedPasswords[u.id] || ''
          }));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
          console.log('修正したデータをローカルストレージに保存しました');
        }
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
      const invitedUsers = loadedUsers.filter(user => user.status === '招待中' || user.isInvited === true);
      console.log('読み込んだ招待中ユーザー:', invitedUsers.length, '件');
      
      invitedUsers.forEach((user, index) => {
        console.log(`招待中ユーザー${index}:`, {
          email: user.email,
          inviteToken: user.inviteToken || '',
          status: user.status,
          isInvited: user.isInvited,
          companyId: user.companyId || 'not set'
        });
      });
    } catch (error) {
      console.error('[loadUserData] Failed to parse users from localStorage:', error);
    }
  }
  return { users: loadedUsers, passwords: loadedPasswords };
};
