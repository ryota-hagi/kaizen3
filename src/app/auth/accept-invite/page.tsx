'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

// 招待受諾ページの状態
type Status = 'loading' | 'verifying' | 'redirecting' | 'error' | 'idle';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const cid = searchParams.get('companyId');

    if (!token || !cid) {
      setError('招待情報がURLに含まれていません。招待リンクを確認してください。');
      setStatus('error');
      return;
    }
    setInviteToken(token);
    setCompanyId(cid);
    setStatus('idle'); // トークンとCompanyID取得完了
  }, [searchParams]);

  useEffect(() => {
    if (status !== 'idle' || !inviteToken || !companyId) return;

    const verifyAndRedirect = async () => {
      setStatus('verifying');
      const supabase = getSupabaseClient();

      try {
        // 1. 強制ログアウト
        console.log('[AcceptInvite] Signing out existing session...');
        await supabase.auth.signOut();
        console.log('[AcceptInvite] Sign out complete.');

        // 2. APIでトークンとCompanyIDを検証
        console.log(`[AcceptInvite] Verifying token: ${inviteToken}, companyId: ${companyId}`);
        const verifyUrl = `/api/invitations/verify`; // バッククォートのエスケープを削除
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken, companyId: companyId }),
        });

        const result = await response.json();
        console.log('[AcceptInvite] Verification API response:', result);

        if (!response.ok || !result.ok || !result.valid) {
          throw new Error(result.message || '招待トークンが無効か期限切れです。');
        }

        // 3. 検証成功：一時的に情報を保存
        const verificationData = {
          email: result.email,
          companyId: result.company_id,
          role: result.role,
          token: inviteToken, // コールバックで使う可能性のためトークンも保存
        };
        sessionStorage.setItem('invite_verification_data', JSON.stringify(verificationData));
        console.log('[AcceptInvite] Verification successful. Stored data:', verificationData);

        // 4. Googleログインへリダイレクト (コールバック先を指定)
        setStatus('redirecting');
        console.log('[AcceptInvite] Redirecting to Google Sign-In...');
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/accept-invite/callback`, // バッククォートのエスケープを削除
          },
        });

        if (signInError) {
          // 不要なバックスラッシュを削除
          throw new Error(`Googleログインへのリダイレクトに失敗しました: ${signInError.message}`);
        }
        // リダイレクトされるので、これ以降のコードは通常実行されない
      } catch (err) {
        console.error('[AcceptInvite] Error:', err);
        setError(err instanceof Error ? err.message : '招待の処理中にエラーが発生しました。');
        setStatus('error');
        // エラー発生時は念のためストレージをクリア
        sessionStorage.removeItem('invite_verification_data');
      }
    };

    verifyAndRedirect();
  }, [status, inviteToken, companyId, router]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>招待の受諾</h1>
      {status === 'loading' && <p>招待情報を読み込んでいます...</p>}
      {status === 'verifying' && <p>招待を検証しています...</p>}
      {status === 'redirecting' && <p>Googleログインにリダイレクトします...</p>}
      {status === 'error' && (
        <div>
          <p style={{ color: 'red' }}>エラーが発生しました:</p>
          <p>{error}</p>
          <button onClick={() => router.push('/auth/login')}>ログインページへ</button>
        </div>
      )}
       {status === 'idle' && <p>招待情報を確認しました。処理を開始します...</p>}
    </div>
  );
}
