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
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        
        // Supabaseのセッションを取得
        const client = supabase()
        const { data, error } = await client.auth.getSession()
        
        if (error) {
          console.error('[DEBUG] Error getting session:', error)
          setError('認証中にエラーが発生しました')
          setLoading(false)
          return
        }
        
        if (!data.session) {
          console.error('[DEBUG] No session found')
          setError('セッションが見つかりません')
          setLoading(false)
          return
        }
        
        // ユーザー情報を取得
        const { data: { user }, error: userError } = await client.auth.getUser()
        
        if (userError || !user) {
          console.error('[DEBUG] Error getting user:', userError)
          setError('ユーザー情報の取得に失敗しました')
          setLoading(false)
          return
        }
        
        console.log('[DEBUG] Authenticated user email:', user.email)
        
        // 必要なテーブルが存在するか確認
        try {
          // app_usersテーブルの確認
          const { success: userTableSuccess, exists: userTableExists, error: userTableError } = await checkAppUsersTable()
          if (!userTableSuccess) {
            console.error('[DEBUG] Error checking app_users table:', userTableError)
          } else if (!userTableExists) {
            console.warn('[DEBUG] app_users table does not exist. Please create it in the Supabase dashboard.')
          }
          
          // companiesテーブルの確認
          const { success: companyTableSuccess, error: companyTableError } = await createCompaniesTable()
          if (!companyTableSuccess) {
            console.error('[DEBUG] Error checking companies table:', companyTableError)
          } else {
            console.log('[DEBUG] Companies table check completed successfully')
          }
          
          // invitationsテーブルの確認
          const { success: invitationsTableSuccess, exists: invitationsTableExists, error: invitationsTableError } = await checkInvitationsTable()
          if (!invitationsTableSuccess) {
            console.error('[DEBUG] Error checking invitations table:', invitationsTableError)
          } else if (!invitationsTableExists) {
            console.warn('[DEBUG] invitations table does not exist. Please create it in the Supabase dashboard.')
          } else {
            console.log('[DEBUG] Invitations table check completed successfully')
          }
        } catch (tableError) {
          console.error('[DEBUG] Exception checking tables:', tableError)
        }
        
        // 招待トークンの確認
        const inviteToken = sessionStorage.getItem('invite_token')
        
        if (inviteToken) {
          console.log('[DEBUG] Found invite token in session storage:', inviteToken)
          
          // 招待トークンの検証
          const { valid, user: invitedUser, error: verifyError } = await verifyInviteToken(inviteToken)
          
          if (valid && invitedUser) {
            console.log('[DEBUG] Valid invitation found for company:', invitedUser.companyId)
            
            // 招待が有効な場合、ユーザー情報を更新して招待を完了
            const updateSuccess = await updateUserAfterGoogleSignIn({
              companyId: invitedUser.companyId,
              role: invitedUser.role || '一般ユーザー',
              inviteToken
            })
            
            if (updateSuccess) {
              // 招待トークンをクリア
              sessionStorage.removeItem('invite_token')
              
              // ダッシュボードにリダイレクト
              console.log('[DEBUG] Redirecting invited user to dashboard')
              router.push('/dashboard')
              return
            } else {
              console.error('[DEBUG] Failed to update user after invitation')
              setError('招待の処理中にエラーが発生しました')
              setLoading(false)
              return
            }
          } else {
            console.error('[DEBUG] Invalid invitation token:', verifyError)
            // 無効な招待トークンの場合は通常のログインフローに進む
            sessionStorage.removeItem('invite_token')
          }
        }
        
        // 通常のログイン
        const success = await loginWithGoogle()
        
        if (success) {
          // ユーザーが既存かどうかを確認
          const { data: { user } } = await client.auth.getUser()
          
          if (!user) {
            setError('ユーザー情報の取得に失敗しました')
            setLoading(false)
            return
          }
          
          // Supabaseのユーザーメタデータから会社IDを取得
          const companyIdFromMetadata = user.user_metadata?.company_id
          
          // app_usersテーブルにユーザー情報が存在するか確認
          try {
            const result = await getUserFromDatabase(user.id)
            
            if (!result.success || !result.data) {
              console.log('[DEBUG] User not found in database, creating new record')
              
              // ユーザー情報をデータベースに保存
              const saveResult = await saveUserToDatabase(user.id, {
                email: user.email || '',
                fullName: user.user_metadata?.full_name || '',
                role: user.user_metadata?.role || '一般ユーザー',
                status: 'アクティブ',
                createdAt: user.created_at,
                companyId: companyIdFromMetadata || ''
              })
              
              if (!saveResult.success) {
                console.error('[DEBUG] Error saving user to database:', saveResult.error)
                // エラーがあっても処理を続行
              }
            } else {
              console.log('[DEBUG] User found in database:', result.data)
            }
          } catch (dbError) {
            console.error('[DEBUG] Database operation error:', dbError)
            // データベースエラーがあっても認証フローを続行
          }
          
          if (companyIdFromMetadata) {
            // 会社IDがある場合はダッシュボードへ
            console.log('[DEBUG] Redirecting to dashboard with company ID:', companyIdFromMetadata)
            router.push('/dashboard')
          } else {
            // 会社IDがない場合は会社登録ページへ
            console.log('[DEBUG] Redirecting to company registration page')
            router.push('/auth/register/company')
          }
        } else {
          setError('ログインに失敗しました')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('認証処理中にエラーが発生しました')
      } finally {
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
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              ログインページに戻る
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
        </div>
      </div>
    </div>
  )
}
