// ローカルストレージのユーザーデータを修正するスクリプト
// このスクリプトをブラウザのコンソールで実行してください

function fixLocalStorage() {
  // 現在のユーザーデータを取得
  const USERS_STORAGE_KEY = 'kaizen_users';
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  
  if (!savedUsers) {
    console.log('ユーザーデータがありません');
    return 'ユーザーデータがありません';
  }
  
  try {
    const parsedData = JSON.parse(savedUsers);
    console.log('現在のユーザーデータ:', parsedData.length, '件');
    
    // 招待中のユーザーを確認
    const invitedUsers = parsedData.filter(item => 
      item.user && (item.user.status === '招待中' || item.user.isInvited === true)
    );
    console.log('修正前の招待中のユーザー:', invitedUsers.length, '件');
    
    // 招待中のユーザーの詳細を表示
    invitedUsers.forEach((item, index) => {
      console.log(`修正前の招待中ユーザー${index}:`, {
        id: item.user.id,
        email: item.user.email,
        inviteToken: item.user.inviteToken || '',
        status: item.user.status,
        isInvited: item.user.isInvited,
        companyId: item.user.companyId
      });
    });
    
    // ユーザーデータを修正
    let hasChanges = false;
    parsedData.forEach(item => {
      if (!item.user) return;
      
      // ステータスが招待中の場合、isInvitedフラグを設定
      if (item.user.status === '招待中' && item.user.isInvited !== true) {
        item.user.isInvited = true;
        console.log(`ユーザー ${item.user.email} のisInvitedフラグを設定`);
        hasChanges = true;
      }
      
      // isInvitedフラグがtrueの場合、ステータスを招待中に設定
      if (item.user.isInvited === true && item.user.status !== '招待中') {
        item.user.status = '招待中';
        console.log(`ユーザー ${item.user.email} のステータスを招待中に設定`);
        hasChanges = true;
      }
      
      // 招待中のユーザーには必ずトークンを設定
      if ((item.user.status === '招待中' || item.user.isInvited === true) && 
          (!item.user.inviteToken || item.user.inviteToken === '')) {
        item.user.inviteToken = Math.random().toString(36).substring(2, 10);
        console.log(`ユーザー ${item.user.email} のトークンを生成: ${item.user.inviteToken}`);
        hasChanges = true;
      }
    });
    
    // テスト用の招待ユーザーを追加
    const testUser = {
      user: {
        id: Date.now().toString(),
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'テストユーザー',
        role: '一般ユーザー',
        companyId: '株式会社テスト',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        status: '招待中',
        isInvited: true,
        inviteToken: Math.random().toString(36).substring(2, 10)
      },
      password: ''
    };
    
    console.log('テスト用の招待ユーザーを追加します:', testUser.user);
    parsedData.push(testUser);
    hasChanges = true;
    
    // 変更があった場合のみ保存
    if (hasChanges) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
      console.log('ユーザーデータを修正して保存しました');
      
      // 修正後のデータを確認
      const modifiedData = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
      const modifiedInvitedUsers = modifiedData.filter(item => 
        item.user && (item.user.status === '招待中' || item.user.isInvited === true)
      );
      console.log('修正後の招待中のユーザー:', modifiedInvitedUsers.length, '件');
      
      modifiedInvitedUsers.forEach((item, index) => {
        console.log(`修正後の招待中ユーザー${index}:`, {
          id: item.user.id,
          email: item.user.email,
          inviteToken: item.user.inviteToken || '',
          status: item.user.status,
          isInvited: item.user.isInvited,
          companyId: item.user.companyId
        });
      });
    } else {
      console.log('ユーザーデータに変更なし、保存をスキップします');
    }
    
    return '完了しました。ページをリロードしてください。';
  } catch (error) {
    console.error('ユーザーデータの解析に失敗しました:', error);
    return 'エラーが発生しました: ' + error.message;
  }
}

// 実行
fixLocalStorage();

// ローカルストレージをクリアする関数
function clearLocalStorage() {
  localStorage.removeItem('kaizen_users');
  localStorage.removeItem('kaizen_user_info');
  console.log('ローカルストレージをクリアしました');
}

// ローカルストレージをクリアする場合はコメントを外して実行
// clearLocalStorage();
