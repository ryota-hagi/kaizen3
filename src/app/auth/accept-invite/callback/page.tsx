'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { UserInfo, UserStatus } from '@/utils/api';
import { USER_STORAGE_KEY, USERS_STORAGE_KEY } from '@/contexts/UserContext/utils';

// コールバックページの状態
type Status = 'processing' | 'completing' | 'redirecting' | 'error';

export default function AcceptInviteCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processInviteCallback = async () => {
      const supabase = getSupabaseClient();

      try {
        // 1. Supabaseセッションを確認し、ユーザー情報を取得
        console.log('[AcceptInviteCallback] Checking Supabase session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user) {
          throw new Error('Supabaseセッションが見つかりません。ログインし直してください。');
        }
        const authUser = session.user;
        console.log('[AcceptInviteCallback] Supabase user found:', authUser.email);

        // 2. sessionStorageから検証済み招待情報を取得
        console.log('[AcceptInviteCallback] Retrieving verification data from sessionStorage...');
        const storedData = sessionStorage.getItem('invite_verification_data');
        if (!storedData) {
          throw new Error('招待検証情報が見つかりません。招待プロセスを最初からやり直してください。');
        }
        const verificationData = JSON.parse(storedData);
        console.log('[AcceptInviteCallback] Verification data retrieved:', verificationData);

        // 3. メールアドレスの一致を確認
        console.log('[AcceptInviteCallback] Verifying email match...');
        if (authUser.email !== verificationData.email) {
          console.error('[AcceptInviteCallback] Email mismatch:', {
            authUserEmail: authUser.email,
            invitedEmail: verificationData.email,
          });
          // 不一致の場合はログアウトさせる
          await supabase.auth.signOut();
          sessionStorage.removeItem('invite_verification_data'); // 不要なデータを削除
          throw new Error(`招待されたメールアドレス (${verificationData.email}) と異なるアカウント (${authUser.email}) でログインしました。正しいアカウントでログインし直してください。`);
        }
        console.log('[AcceptInviteCallback] Email match successful.');

        // 4. 招待完了APIを呼び出す
        setStatus('completing');
        console.log('[AcceptInviteCallback] Completing invitation via API...');
        const completeUrl = '/api/invitations/complete';
        const completeResponse = await fetch(completeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invite_token: verificationData.token,
            auth_uid: authUser.id,
            email: authUser.email, // emailも送信
          }),
        });

        const completeResult = await completeResponse.json();
        console.log('[AcceptInviteCallback] Completion API response:', completeResult);
        if (!completeResponse.ok || !completeResult.ok) {
          // APIエラーでも処理は続行するが、警告を出す
          console.warn('[AcceptInviteCallback] Failed to complete invitation via API, proceeding anyway...');
        } else {
          console.log('[AcceptInviteCallback] Invitation completed successfully via API.');
        }

        // 5. Supabaseユーザーメタデータを更新
        console.log('[AcceptInviteCallback] Updating Supabase user metadata...');
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            company_id: verificationData.companyId,
            status: 'アクティブ',
            isInvited: false, // 招待フラグを確実にfalseに
            // 必要であれば他のメタデータも更新 (例: role)
            // role: verificationData.role
          },
        });
        if (updateError) {
          // メタデータ更新エラーでも処理は続行するが、警告を出す
          console.warn('[AcceptInviteCallback] Failed to update user metadata:', updateError);
        } else {
           console.log('[AcceptInviteCallback] User metadata updated successfully.');
        }


        // 6. 既存のUserContext関連ストレージをクリア
        console.log('[AcceptInviteCallback] Clearing existing user storage...');
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(USERS_STORAGE_KEY);
        sessionStorage.removeItem(USER_STORAGE_KEY); // セッションストレージもクリア
        sessionStorage.removeItem(USERS_STORAGE_KEY);
        console.log('[AcceptInviteCallback] Existing user storage cleared.');

        // 7. 新しいUserInfoオブジェクトを作成
        const newUserInfo: UserInfo = {
          id: authUser.id,
          username: authUser.email?.split('@')[0] || '',
          email: authUser.email || '',
          fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          role: verificationData.role || '一般ユーザー', // API/検証データから取得
          status: 'アクティブ' as UserStatus,
          createdAt: authUser.created_at || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isInvited: false,
          inviteToken: '', // 完了したので不要 (空文字列を代入)
          companyId: verificationData.companyId, // 検証済みの会社IDを使用
        };
        console.log('[AcceptInviteCallback] Created new UserInfo:', newUserInfo);

        // 8. 新しいUserInfoをlocalStorageとsessionStorageに保存
        console.log('[AcceptInviteCallback] Saving new UserInfo to storage...');
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserInfo));
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([{ user: newUserInfo, password: '' }])); // 配列形式で保存
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserInfo)); // セッションにも保存
        sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([{ user: newUserInfo, password: '' }]));
        console.log('[AcceptInviteCallback] New UserInfo saved to storage.');

        // 9. 一時的な招待情報を削除
        sessionStorage.removeItem('invite_verification_data');
        console.log('[AcceptInviteCallback] Temporary verification data removed.');

        // 10. ダッシュボードへリダイレクト
        setStatus('redirecting');
        console.log('[AcceptInviteCallback] Redirecting to dashboard...');
        router.push('/dashboard');

      } catch (err) {
        console.error('[AcceptInviteCallback] Error:', err);
        setError(err instanceof Error ? err.message : '招待の完了処理中にエラーが発生しました。');
        setStatus('error');
        // エラー発生時は念のためストレージをクリア
        sessionStorage.removeItem('invite_verification_data');
        // エラー時はログインページにリダイレクトさせるなど検討
        // await supabase.auth.signOut(); // 必要に応じてログアウト
        // router.push('/auth/login');
      }
    };

    processInviteCallback();
  }, [router]); // router のみ依存配列に含める

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>招待の完了処理</h1>
      {status === 'processing' && <p>ログイン情報を処理しています...</p>}
      {status === 'completing' && <p>招待を完了しています...</p>}
      {status === 'redirecting' && <p>ダッシュボードにリダイレクトします...</p>}
      {status === 'error' && (
        <div>
          <p style={{ color: 'red' }}>エラーが発生しました:</p>
          <p>{error}</p>
          {/* エラー内容に応じて適切なボタンやリンクを表示 */}
          <button onClick={() => router.push('/auth/login')}>ログインページへ</button>
        </div>
      )}
    </div>
  );
}
