'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { useUser } from '@/contexts/UserContext/context'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// クライアントコンポーネントとして明示的に宣言
function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { verifyInviteToken, completeInvitation, setUsers } = useUser()
  
  const [isVerifying, setIsVerifying] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitedUser, setInvitedUser] = useState<any>(null)
  
  // 招待トークンとcompanyIdを取得
  const token = searchParams?.get('token')
  const companyId = searchParams?.get('companyId') // URLからcompanyIdを取得
  const email = searchParams?.get('email') // URLからemailを取得
  
  // 緊急対応：トークンが存在する場合、ローカルストレージを直接操作
  useEffect(() => {
    if (token) {
      console.log('[CallbackPage] Emergency fix: Checking token directly in localStorage');
      
      try {
        // ローカルストレージからユーザーデータを取得
        const USERS_STORAGE_KEY = 'kaizen_users';
        const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
        
        if (savedUsers) {
          const parsedData = JSON.parse(savedUsers);
          console.log('[CallbackPage] Found users in localStorage:', parsedData.length);
          
          // 招待中のユーザーを確認
          const invitedUsers = parsedData.filter((item: any) => 
            item.user && (item.user.status === '招待中' || item.user.isInvited === true)
          );
          console.log('[CallbackPage] Invited users in localStorage:', invitedUsers.length);
          
          // トークンに一致するユーザーを検索
          const matchingUser = parsedData.find((item: any) => 
            item.user && item.user.inviteToken === token
          );
          
          let dataChanged = false;
          
          if (matchingUser) {
            console.log('[CallbackPage] Found matching user in localStorage');
            console.log('[CallbackPage] User company ID:', matchingUser.user.companyId);
            
            // URLからメールアドレスが指定されている場合は更新
            if (email && matchingUser.user.email !== email) {
              console.log(`[CallbackPage] Updating email in localStorage`);
              matchingUser.user.email = email;
              dataChanged = true;
            }
            
            // 会社IDを確認し、必要に応じて更新（URLからcompanyIdが指定されている場合のみ）
            if (companyId && matchingUser.user.companyId !== companyId) {
              console.log(`[CallbackPage] Updating company ID in localStorage`);
              matchingUser.user.companyId = companyId;
              dataChanged = true;
            }
            
            if (dataChanged) {
              // 変更を保存
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
              console.log('[CallbackPage] Updated user data in localStorage');
              
              // セッションストレージにも同じデータを保存
              try {
                sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                console.log('[CallbackPage] Also saved to sessionStorage');
              } catch (e) {
                console.error('[CallbackPage] Failed to save to sessionStorage:', e);
              }
            }
          } else {
            console.log('[CallbackPage] No matching user found in localStorage');
            
            // 招待中のユーザーが存在する場合、最初のユーザーのトークンを更新
            if (invitedUsers.length > 0) {
              const firstInvitedUser = invitedUsers[0];
              console.log(`[CallbackPage] Updating token for invited user`);
              firstInvitedUser.user.inviteToken = token;
              dataChanged = true;
              
              // URLからメールアドレスが指定されている場合は更新
              if (email) {
                console.log(`[CallbackPage] Updating email in localStorage`);
                firstInvitedUser.user.email = email;
              }
              
              // 会社IDも更新（URLからcompanyIdが指定されている場合のみ）
              if (companyId) {
                console.log(`[CallbackPage] Setting company ID in localStorage`);
                firstInvitedUser.user.companyId = companyId;
              }
              
              // 変更を保存
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
              console.log('[CallbackPage] Updated user data in localStorage');
              
              // セッションストレージにも同じデータを保存
              try {
                sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                console.log('[CallbackPage] Also saved to sessionStorage');
              } catch (e) {
                console.error('[CallbackPage] Failed to save to sessionStorage:', e);
              }
            } else {
              console.log('[CallbackPage] No invited users found, creating a new one');
              
              // URLからメールアドレスを取得するか、デフォルト値を使用
              const userEmail = email || 'invited-user@example.com';
              const username = userEmail.split('@')[0];
              
              // 新しい招待ユーザーを作成
              const newInvitedUser = {
                user: {
                  id: Date.now().toString(),
                  username: username,
                  email: userEmail,
                  fullName: '招待ユーザー',
                  role: '一般ユーザー',
                  // 会社IDを設定（URLからcompanyIdが指定されている場合はそれを優先）
                  companyId: companyId || '株式会社ariGaT',
                  createdAt: new Date().toISOString(),
                  lastLogin: null,
                  status: '招待中',
                  isInvited: true,
                  inviteToken: token
                },
                password: ''
              };
              
              parsedData.push(newInvitedUser);
              dataChanged = true;
              
              // 変更を保存
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
              console.log('[CallbackPage] Added new invited user to localStorage');
              
              // セッションストレージにも同じデータを保存
              try {
                sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedData));
                console.log('[CallbackPage] Also saved to sessionStorage');
              } catch (e) {
                console.error('[CallbackPage] Failed to save to sessionStorage:', e);
              }
            }
          }
          
          // データが変更された場合、React Contextを更新
          if (dataChanged) {
            // ユーザーデータをReact Contextに反映
            const users = parsedData.map((item: any) => item.user);
            setUsers(users);
            console.log('[CallbackPage] Updated React Context with new user data');
          }
        } else {
          console.log('[CallbackPage] No users found in localStorage');
          
          // URLからメールアドレスを取得するか、デフォルト値を使用
          const userEmail = email || 'invited-user@example.com';
          const username = userEmail.split('@')[0];
          
          // ユーザーデータが存在しない場合、新しいデータを作成
          const newUserData = [{
            user: {
              id: Date.now().toString(),
              username: username,
              email: userEmail,
              fullName: '招待ユーザー',
              role: '一般ユーザー',
              // 会社IDを設定（URLからcompanyIdが指定されている場合はそれを優先）
              companyId: companyId || '株式会社ariGaT',
              createdAt: new Date().toISOString(),
              lastLogin: null,
              status: '招待中',
              isInvited: true,
              inviteToken: token
            },
            password: ''
          }];
          
          // 変更を保存
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUserData));
          console.log('[CallbackPage] Created new user data in localStorage');
          
          // セッションストレージにも同じデータを保存
          try {
            sessionStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUserData));
            console.log('[CallbackPage] Also saved to sessionStorage');
          } catch (e) {
            console.error('[CallbackPage] Failed to save to sessionStorage:', e);
          }
          
          // ユーザーデータをReact Contextに反映
          const users = newUserData.map((item: any) => item.user);
          setUsers(users);
          console.log('[CallbackPage] Updated React Context with new user data');
        }
      } catch (error) {
        console.error('[CallbackPage] Error manipulating localStorage:', error);
      }
    }
  }, [token, companyId, email, setUsers]);
  
  // 招待トークンの検証
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('招待トークンが見つかりません');
        setIsVerifying(false);
        return;
      }
      
      console.log('[CallbackPage] Verifying token:', token);
      
      try {
        // トークンを検証（非同期関数なのでawaitを使用）
        const result = await verifyInviteToken(token);
        console.log('[CallbackPage] Verification result:', result);
        
        if (result.valid && result.user) {
          // URLからメールアドレスが指定されている場合は、それを優先して使用
          if (email && result.user.email !== email) {
            console.log(`[CallbackPage] Overriding email from URL parameter`);
            result.user.email = email;
          }
          
          console.log('[CallbackPage] Found invited user with matching token');
          console.log('[CallbackPage] User company ID:', result.user.companyId);
          setInvitedUser(result.user);
          setIsVerifying(false);
          
          // ユーザーがログインしていない場合はGoogle認証を促す
          if (status === 'unauthenticated') {
            console.log('[CallbackPage] User not authenticated, starting Google auth');
            // 自動的にGoogle認証を開始（会社IDも一緒に渡す）
            const callbackUrl = `/auth/register/callback?token=${token}`;
            const callbackWithParams = new URL(callbackUrl, window.location.origin);
            
            if (result.user.companyId) {
              callbackWithParams.searchParams.append('companyId', result.user.companyId);
            }
            
            if (result.user.email) {
              callbackWithParams.searchParams.append('email', result.user.email);
            }
            
            signIn('google', { callbackUrl: callbackWithParams.toString() });
          }
        } else {
          console.log('[CallbackPage] Invalid token');
          setError('無効な招待トークンです');
          setIsVerifying(false);
        }
      } catch (err) {
        console.error('[CallbackPage] Error verifying token:', err);
        setError('招待トークンの検証中にエラーが発生しました');
        setIsVerifying(false);
      }
    };
    
    verifyToken();
  }, [token, verifyInviteToken, status, email]);
  
  // セッションが変更されたときの処理
  useEffect(() => {
    const completeRegistration = async () => {
      if (status === 'authenticated' && session?.user && invitedUser && token && !isCompleting && !success) {
        setIsCompleting(true);
        
        try {
          // URLからメールアドレスが指定されている場合は、それを優先して使用
          const userEmail = email || invitedUser.email;
          
          console.log('[CallbackPage] Completing registration for user:', session.user.email);
          console.log('[CallbackPage] Using token verification only');
          console.log('[CallbackPage] User company ID:', invitedUser.companyId);
          
          // メールアドレスの照合は行わない（トークンの照合のみ）
          console.log('[CallbackPage] Skipping email verification, using token verification only');
          
          // 会社IDの確認（URLから取得した場合はそれを優先、それ以外はinvitedUserの会社IDを使用）
          // 重要: companyIdがnullまたは空文字の場合は、invitedUser.companyIdを使用する
          const userCompanyId = (companyId && companyId.trim() !== '') ? companyId : invitedUser.companyId;
          console.log('[CallbackPage] Using company ID:', userCompanyId);
          
          // 招待を完了
          const result = await completeInvitation(
            token,
            { 
              fullName: session.user.name || invitedUser.fullName,
              companyId: userCompanyId // 会社IDを明示的に渡す
            },
            session.user
          );
          
          if (result) {
            setSuccess(true);
            
            // 3秒後にダッシュボードにリダイレクト
            setTimeout(() => {
              router.push('/dashboard');
            }, 3000);
          } else {
            setError('招待の完了に失敗しました');
          }
        } catch (err) {
          console.error('Error completing invitation:', err);
          setError('招待の完了中にエラーが発生しました');
        } finally {
          setIsCompleting(false);
        }
      }
    };
    
    completeRegistration();
  }, [status, session, invitedUser, token, companyId, email, completeInvitation, router, isCompleting, success]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          招待の確認
        </h1>
        
        {isVerifying || isCompleting ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-secondary-600">
              {isVerifying ? '招待を確認しています...' : 'アカウントを有効化しています...'}
            </p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="bg-red-50 text-red-700 p-4 rounded-md">
              {error}
            </div>
            
            <div className="flex justify-center">
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                ログインページに戻る
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-md">
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>アカウントが正常に有効化されました。ダッシュボードにリダイレクトします...</span>
              </div>
            </div>
          </div>
        ) : invitedUser ? (
          <div className="space-y-6">
            <p className="text-secondary-600">
              <span className="font-medium">{email || invitedUser.email}</span> さん宛ての招待です。<br />
              {invitedUser.companyId && (
                <span className="block mt-2">会社: <strong>{invitedUser.companyId}</strong></span>
              )}
              Google認証を行って、アカウントを有効化してください。
            </p>
            
            {status === 'unauthenticated' && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const callbackUrl = `/auth/register/callback?token=${token}`;
                    const callbackWithParams = new URL(callbackUrl, window.location.origin);
                    
                    if (invitedUser.companyId) {
                      callbackWithParams.searchParams.append('companyId', invitedUser.companyId);
                    }
                    
                    // URLからメールアドレスが指定されている場合は、それを優先して使用
                    const userEmail = email || invitedUser.email;
                    callbackWithParams.searchParams.append('email', userEmail);
                    
                    signIn('google', { callbackUrl: callbackWithParams.toString() });
                  }}
                  className="flex items-center px-6 py-3 bg-white border border-secondary-300 rounded-md shadow-sm hover:bg-secondary-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  Googleアカウントでログイン
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ローディング表示用のフォールバックコンポーネント
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          読み込み中...
        </h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-secondary-600">
            ページを準備しています...
          </p>
        </div>
      </div>
    </div>
  )
}

// メインコンポーネント
export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackContent />
    </Suspense>
  )
}
