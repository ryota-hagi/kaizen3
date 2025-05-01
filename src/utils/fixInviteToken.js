// 招待トークンの問題を修正するスクリプト
// このスクリプトをブラウザのコンソールで実行してください

function fixInviteToken() {
  console.log('=== 招待トークンの問題を修正 ===');
  
  // ユーザーデータを取得
  const USERS_STORAGE_KEY = 'kaizen_users';
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  
  if (!savedUsers) {
    console.log('ユーザーデータがありません');
    return 'ユーザーデータがありません';
  }
  
  try {
    const parsedData = JSON.parse(savedUsers);
    console.log('現在のユーザーデータ:', parsedData.length, '件');
    
    // URLパラメータから招待トークンを取得（存在する場合）
    let urlToken = '';
    const urlParams = new URLSearchParams(window.location.search);
    urlToken = urlParams.get('token') || '';
    
    if (urlToken) {
      console.log('URLから取得したトークン:', urlToken);
      
      // トークンに一致するユーザーを検索
      const matchingUser = parsedData.find(item => 
        item.user && item.user.inviteToken === urlToken
      );
      
      if (matchingUser) {
        console.log('トークンに一致するユーザーが見つかりました:', matchingUser.user.email);
        
        // ユーザーのステータスとisInvitedフラグを確認
        if (matchingUser.user.status !== '招待中') {
          matchingUser.user.status = '招待中';
          console.log(`ユーザー ${matchingUser.user.email} のステータスを招待中に設定`);
        }
        
        if (matchingUser.user.isInvited !== true) {
          matchingUser.user.isInvited = true;
          console.log(`ユーザー ${matchingUser.user.email} のisInvitedフラグを設定`);
        }
        
        // 変更を保存
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
        console.log('ユーザーデータを修正して保存しました');
        
        return '招待トークンに一致するユーザーを修正しました。ページをリロードしてください。';
      } else {
        console.log('トークンに一致するユーザーが見つかりません');
        
        // 招待中のユーザーを確認
        const invitedUsers = parsedData.filter(item => 
          item.user && (item.user.status === '招待中' || item.user.isInvited === true)
        );
        console.log('招待中のユーザー:', invitedUsers.length, '件');
        
        // 招待中のユーザーの詳細を表示
        invitedUsers.forEach((item, index) => {
          console.log(`招待中ユーザー${index}:`, {
            id: item.user.id,
            email: item.user.email,
            inviteToken: item.user.inviteToken || '',
            status: item.user.status,
            isInvited: item.user.isInvited
          });
        });
        
        // 招待中のユーザーが存在する場合、最初のユーザーのトークンを現在のURLトークンに設定
        if (invitedUsers.length > 0) {
          const firstInvitedUser = invitedUsers[0];
          console.log(`ユーザー ${firstInvitedUser.user.email} のトークンを ${urlToken} に設定`);
          firstInvitedUser.user.inviteToken = urlToken;
          
          // 変更を保存
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
          console.log('ユーザーデータを修正して保存しました');
          
          return '招待中のユーザーのトークンを修正しました。ページをリロードしてください。';
        }
        
        // 招待中のユーザーが存在しない場合、新しい招待ユーザーを作成
        const newInvitedUser = {
          user: {
            id: Date.now().toString(),
            username: 'inviteduser',
            email: 'arigat.cl01@gmail.com', // 実際の招待メールアドレスに変更してください
            fullName: '招待ユーザー',
            role: '一般ユーザー',
            companyId: parsedData[0]?.user?.companyId || '株式会社サンプル',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            status: '招待中',
            isInvited: true,
            inviteToken: urlToken
          },
          password: ''
        };
        
        console.log('新しい招待ユーザーを作成:', newInvitedUser.user);
        parsedData.push(newInvitedUser);
        
        // 変更を保存
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
        console.log('ユーザーデータを修正して保存しました');
        
        return '新しい招待ユーザーを作成しました。ページをリロードしてください。';
      }
    } else {
      console.log('URLにトークンがありません');
      
      // 招待中のユーザーを確認
      const invitedUsers = parsedData.filter(item => 
        item.user && (item.user.status === '招待中' || item.user.isInvited === true)
      );
      console.log('招待中のユーザー:', invitedUsers.length, '件');
      
      // 招待中のユーザーの詳細を表示
      invitedUsers.forEach((item, index) => {
        console.log(`招待中ユーザー${index}:`, {
          id: item.user.id,
          email: item.user.email,
          inviteToken: item.user.inviteToken || '',
          status: item.user.status,
          isInvited: item.user.isInvited
        });
      });
      
      // 招待中のユーザーが存在しない場合、新しい招待ユーザーを作成
      if (invitedUsers.length === 0) {
        const newInvitedUser = {
          user: {
            id: Date.now().toString(),
            username: 'inviteduser',
            email: 'arigat.cl01@gmail.com', // 実際の招待メールアドレスに変更してください
            fullName: '招待ユーザー',
            role: '一般ユーザー',
            companyId: parsedData[0]?.user?.companyId || '株式会社サンプル',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            status: '招待中',
            isInvited: true,
            inviteToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
          },
          password: ''
        };
        
        console.log('新しい招待ユーザーを作成:', newInvitedUser.user);
        parsedData.push(newInvitedUser);
        
        // 変更を保存
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
        console.log('ユーザーデータを修正して保存しました');
        
        return '新しい招待ユーザーを作成しました。ページをリロードしてください。';
      }
      
      return '招待中のユーザーが既に存在します。修正は必要ありません。';
    }
  } catch (error) {
    console.error('ユーザーデータの解析に失敗しました:', error);
    return 'エラーが発生しました: ' + error.message;
  }
}

// 実行
fixInviteToken();
