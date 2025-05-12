'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { 
  supabase, 
  checkAppUsersTable, 
  checkInvitationsTable,
  saveUserToDatabase, 
  getUserFromDatabase 
} from '@/lib/supabaseClient'
import { createCompaniesTable } from '@/lib/createCompaniesTable'

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, verifyInviteToken, updateUserAfterGoogleSignIn } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  
  // デバッグフラグ（本番環境では無効化）
  const DEBUG = false;
  
  // デバッグ情報を追加する関数（コンソールログは必要な場合のみ出力）
  const addDebugInfo = (info: string) => {
    if (DEBUG) console.log(info)
    setDebugInfo(prev => [...prev, info])
  }
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        addDebugInfo('認証コールバック処理を開始します')
        
        // URLからハッシュフラグメントを取得（access_tokenなど）
        const hashFragment = typeof window !== 'undefined' ? window.location.hash : ''
        if (hashFragment) {
          addDebugInfo(`ハッシュフラグメントを検出: ${hashFragment.substring(0, 20)}...`)
        }
        
        // Supabaseのセッションを取得
        const client = supabase()
        addDebugInfo('Supabaseクライアントを初期化しました')
        
        const { data, error } = await client.auth.getSession()
        
        if (error) {
          addDebugInfo(`セッション取得エラー: ${error.message}`)
          setError('認証中にエラーが発生しました')
          setLoading(false)
          return
        }
        
        if (!data.session) {
          addDebugInfo('セッションが見つかりません')
          
          // セッションがない場合、ハッシュフラグメントからトークンを取得して処理
          if (hashFragment && hashFragment.includes('access_token')) {
            addDebugInfo('URLからアクセストークンを検出しました。セッションを設定します')
            
            try {
              // ハッシュフラグメントからトークンを抽出
              const params = new URLSearchParams(hashFragment.substring(1))
              const accessToken = params.get('access_token')
              
              if (accessToken) {
                addDebugInfo('アクセストークンを使用してセッションを設定します')
                
                // セッションを設定
                const { error: setSessionError } = await client.auth.setSession({
                  access_token: accessToken,
                  refresh_token: params.get('refresh_token') || '',
                })
                
                if (setSessionError) {
                  addDebugInfo(`セッション設定エラー: ${setSessionError.message}`)
                  setError('セッションの設定に失敗しました')
                  setLoading(false)
                  return
                }
                
                addDebugInfo('セッションを正常に設定しました')
              } else {
                addDebugInfo('アクセストークンが見つかりません')
                setError('認証トークンが見つかりません')
                setLoading(false)
                return
              }
            } catch (tokenError) {
              addDebugInfo(`トークン処理エラー: ${tokenError}`)
              setError('認証トークンの処理に失敗しました')
              setLoading(false)
              return
            }
          } else {
            addDebugInfo('セッションとアクセストークンの両方が見つかりません')
            setError('セッションが見つかりません')
            setLoading(false)
            return
          }
        } else {
          addDebugInfo('有効なセッションを検出しました')
        }
        
        // ユーザー情報を取得
        const { data: userData, error: userError } = await client.auth.getUser()
        
        if (userError || !userData.user) {
          addDebugInfo(`ユーザー情報取得エラー: ${userError?.message || 'ユーザーが見つかりません'}`)
          setError('ユーザー情報の取得に失敗しました')
          setLoading(false)
          return
        }
        
        const user = userData.user
        addDebugInfo(`認証されたユーザーのメール: ${user.email}`)
        
        // 必要なテーブルが存在するか確認
        try {
          // app_usersテーブルの確認
          addDebugInfo('app_usersテーブルを確認中...')
          const { success: userTableSuccess, exists: userTableExists, error: userTableError } = await checkAppUsersTable()
          if (!userTableSuccess) {
            addDebugInfo(`app_usersテーブル確認エラー: ${userTableError}`)
          } else if (!userTableExists) {
            addDebugInfo('app_usersテーブルが存在しません')
          } else {
            addDebugInfo('app_usersテーブルが存在します')
          }
          
          // companiesテーブルの確認
          addDebugInfo('companiesテーブルを確認中...')
          const { success: companyTableSuccess, error: companyTableError } = await createCompaniesTable()
          if (!companyTableSuccess) {
            addDebugInfo(`companiesテーブル確認エラー: ${companyTableError}`)
          } else {
            addDebugInfo('companiesテーブルの確認が完了しました')
          }
          
          // invitationsテーブルの確認
          addDebugInfo('invitationsテーブルを確認中...')
          const { success: invitationsTableSuccess, exists: invitationsTableExists, error: invitationsTableError } = await checkInvitationsTable()
          if (!invitationsTableSuccess) {
            addDebugInfo(`invitationsテーブル確認エラー: ${invitationsTableError}`)
          } else if (!invitationsTableExists) {
            addDebugInfo('invitationsテーブルが存在しません')
          } else {
            addDebugInfo('invitationsテーブルが存在します')
          }
        } catch (tableError) {
          addDebugInfo(`テーブル確認例外: ${tableError}`)
        }
        
        // 招待トークンの確認
        const inviteToken = sessionStorage.getItem('invite_token')
        
        if (inviteToken) {
          addDebugInfo(`セッションストレージで招待トークンを検出: ${inviteToken}`)
          
          // 招待トークンの検証
          addDebugInfo('招待トークンを検証中...')
          
          try {
            const verifyResult = await verifyInviteToken(inviteToken)
            
            // 招待トークンの検証結果を処理
            const isValidInvite = verifyResult.valid && verifyResult.user;
            
            if (isValidInvite) {
              const invitedUser = verifyResult.user!
              addDebugInfo(`会社IDの有効な招待を検出: ${invitedUser.companyId}`)
              
              // 招待が有効な場合、ユーザー情報を更新して招待を完了
              addDebugInfo('Google認証後にユーザー情報を更新中...')
              
              // 通常の更新関数を使用
              const updateSuccess = await updateUserAfterGoogleSignIn({
                companyId: invitedUser.companyId,
                role: invitedUser.role || '一般ユーザー',
                inviteToken
              })
              
              if (updateSuccess) {
                // 招待トークンをクリア
                sessionStorage.removeItem('invite_token')
                addDebugInfo('招待トークンをクリアしました')
                
                // ルートパスにリダイレクト
                addDebugInfo('招待されたユーザーをルートパスにリダイレクトします')
                router.push('/')
                return
              } else {
                addDebugInfo('招待後のユーザー更新に失敗しました')
                setError('招待の処理中にエラーが発生しました')
                setLoading(false)
                return
              }
            } else {
              addDebugInfo('無効な招待トークン')
              addDebugInfo('招待トークンが無効か期限切れです')
              
              // 無効な招待トークンの場合は通常のログインフローに進む
              sessionStorage.removeItem('invite_token')
              addDebugInfo('無効な招待トークンをクリアしました')
            }
          } catch (inviteError) {
            addDebugInfo(`招待トークン検証中の例外: ${inviteError}`)
            // エラーがあっても通常のログインフローに進む
            sessionStorage.removeItem('invite_token')
            addDebugInfo('招待トークンをクリアしました（エラー後）')
          }
        }
        
        // セッション情報を明示的に保存する関数
        const saveSessionToStorage = async () => {
          try {
            // 現在のセッションを取得
            const { data: { session } } = await client.auth.getSession();
            
            if (session) {
              addDebugInfo('セッション情報をストレージに明示的に保存します');
              
              // トークンデータを保存（有効期限を24時間に延長）
              const tokenData = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24時間
                expires_in: 24 * 60 * 60, // 24時間
                token_type: session.token_type || 'bearer',
                provider_token: session.provider_token,
                provider_refresh_token: session.provider_refresh_token
              };
              
              // ローカルストレージとセッションストレージの両方に保存
              localStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-token', JSON.stringify(tokenData));
              try { sessionStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-token', JSON.stringify(tokenData)); } catch(e){}
              
              // セッション情報全体も保存
              const sessionData = {
                session: {
                  ...session,
                  expires_at: tokenData.expires_at,
                  expires_in: tokenData.expires_in
                },
                user: session.user
              };
              localStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-data', JSON.stringify(sessionData));
              try { sessionStorage.setItem('sb-czuedairowlwfgbjmfbg-auth-data', JSON.stringify(sessionData)); } catch(e){}
              
              addDebugInfo('セッション情報を延長された有効期限で保存しました');
              
              // ユーザー情報も保存
              if (session.user) {
                const userInfo = {
                  id: session.user.id,
                  username: session.user.email?.split('@')[0] || '',
                  email: session.user.email || '',
                  fullName: session.user.user_metadata?.full_name || '',
                  role: session.user.user_metadata?.role || '一般ユーザー',
                  status: 'アクティブ',
                  createdAt: session.user.created_at || new Date().toISOString(),
                  lastLogin: new Date().toISOString(),
                  isInvited: false,
                  inviteToken: '',
                  companyId: session.user.user_metadata?.company_id || ''
                };
                
                localStorage.setItem('kaizen_user', JSON.stringify(userInfo));
                try { sessionStorage.setItem('kaizen_user', JSON.stringify(userInfo)); } catch(e){}
                
                addDebugInfo('ユーザー情報をストレージに保存しました');
              }
            }
          } catch (storageError) {
            addDebugInfo(`セッション保存エラー: ${storageError}`);
          }
        };
        
        // 通常のログイン
        addDebugInfo('通常のログインプロセスを開始します')
        const success = await loginWithGoogle()
        
        if (success) {
          addDebugInfo('Googleログインに成功しました')
          
          // セッション情報を明示的に保存
          await saveSessionToStorage();
          
          // ユーザーが既存かどうかを確認
          const { data: refreshedUserData } = await client.auth.getUser()
          const refreshedUser = refreshedUserData.user
          
          if (!refreshedUser) {
            addDebugInfo('更新されたユーザー情報の取得に失敗しました')
            setError('ユーザー情報の取得に失敗しました')
            setLoading(false)
            return
          }
          
          // Supabaseのユーザーメタデータから会社IDを取得
          const companyIdFromMetadata = refreshedUser.user_metadata?.company_id
          addDebugInfo(`メタデータから会社ID: ${companyIdFromMetadata || 'なし'}`)
          
          // app_usersテーブルにユーザー情報が存在するか確認
          let companyIdFromDatabase = '';
          try {
            addDebugInfo('データベースからユーザー情報を取得中...')
            const result = await getUserFromDatabase(refreshedUser.id)
            
            if (!result.success || !result.data) {
              addDebugInfo('ユーザーがデータベースに見つかりません。新しいレコードを作成します')
              
              // ユーザー情報をデータベースに保存
              const saveResult = await saveUserToDatabase(refreshedUser.id, {
                email: refreshedUser.email || '',
                fullName: refreshedUser.user_metadata?.full_name || '',
                role: refreshedUser.user_metadata?.role || '一般ユーザー',
                status: 'アクティブ',
                createdAt: refreshedUser.created_at,
                companyId: companyIdFromMetadata || ''
              })
              
              if (!saveResult.success) {
                addDebugInfo(`ユーザーのデータベース保存エラー: ${saveResult.error}`)
                // エラーがあっても処理を続行
              } else {
                addDebugInfo('ユーザー情報をデータベースに保存しました')
              }
            } else {
              addDebugInfo(`ユーザーがデータベースに見つかりました: ${result.data.email}`)
              
              // データベースから会社IDを取得
              companyIdFromDatabase = typeof result.data.company_id === 'string' 
                ? result.data.company_id 
                : result.data.company_id ? String(result.data.company_id) : '';
              addDebugInfo(`データベースから会社ID: ${companyIdFromDatabase || 'なし'}`)
              
              // データベースに会社IDがあるが、メタデータにない場合は、メタデータを更新
              if (companyIdFromDatabase && !companyIdFromMetadata) {
                addDebugInfo(`メタデータに会社IDがないため、データベースの会社ID ${companyIdFromDatabase} で更新します`)
                
                try {
                  // Supabaseのユーザーメタデータを更新
                  const { error } = await client.auth.updateUser({
                    data: {
                      company_id: companyIdFromDatabase,
                      role: result.data.role || '一般ユーザー',
                      status: 'アクティブ'
                    }
                  });
                  
                  if (error) {
                    addDebugInfo(`メタデータ更新エラー: ${error.message}`)
                  } else {
                    addDebugInfo('メタデータを正常に更新しました')
                  }
                } catch (metaError) {
                  addDebugInfo(`メタデータ更新例外: ${metaError}`)
                }
              }
            }
          } catch (dbError) {
            addDebugInfo(`データベース操作エラー: ${dbError}`)
            // データベースエラーがあっても認証フローを続行
          }
          
          // 会社IDの優先順位: メタデータ > データベース
          const effectiveCompanyId = companyIdFromMetadata || companyIdFromDatabase;
          
          if (effectiveCompanyId) {
            // 会社IDがある場合はルートパスへ
            addDebugInfo(`有効な会社ID ${effectiveCompanyId} でルートパスにリダイレクトします`)
            router.push('/')
          } else {
            // 会社IDがない場合は会社登録ページへ
            addDebugInfo('会社IDが見つからないため、会社登録ページにリダイレクトします')
            router.push('/auth/register/company')
          }
        } else {
          addDebugInfo('ログインに失敗しました')
          setError('ログインに失敗しました')
          setLoading(false)
        }
      } catch (err) {
        if (DEBUG) console.error('Callback error:', err)
        addDebugInfo(`コールバックエラー: ${err}`)
        setError('認証処理中にエラーが発生しました')
        setLoading(false)
      }
    }
    
    handleCallback()
  }, [router, searchParams, loginWithGoogle, verifyInviteToken, updateUserAfterGoogleSignIn])
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
            エラーが発生しました
          </h1>
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
          
          {/* デバッグ情報を表示 */}
          <div className="mt-4 mb-4">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                デバッグ情報を表示
              </summary>
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap">
                {debugInfo.map((info, index) => (
                  <div key={index} className="mb-1">{info}</div>
                ))}
              </div>
            </details>
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              ログインページに戻る
            </button>
            
            <button
              onClick={() => router.push('/fix-google-auth.html')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              認証修正ツールを開く
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          認証処理中...
        </h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-secondary-600">
            認証情報を処理しています...
          </p>
          
          {/* デバッグ情報を表示 */}
          <div className="mt-4 w-full">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                デバッグ情報を表示
              </summary>
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-left whitespace-pre-wrap max-h-60 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index} className="mb-1">{info}</div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
