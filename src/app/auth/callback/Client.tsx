'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { INVITATIONS_TABLE, INVITATIONS_VIEW } from '@/constants/invitations'

// デバッグ用：テーブル名を確認
console.log('[DEBUG] INVITATIONS_TABLE =', INVITATIONS_TABLE)
console.log('[DEBUG] INVITATIONS_VIEW =', INVITATIONS_VIEW)

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, updateUserAfterGoogleSignIn, users } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        
        // Supabaseのセッションを取得
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.getSession()
        
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
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('[DEBUG] Error getting user:', userError)
          setError('ユーザー情報の取得に失敗しました')
          setLoading(false)
          return
        }
        
        console.log('[DEBUG] Authenticated user email:', user.email)
        
        // 招待ユーザーかどうかを確認
        const isInvited = searchParams?.get('invite') === 'true'
        
        // トークンと会社IDを取得（URLパラメータ、セッションストレージ、ローカルストレージの順に確認）
        const urlToken = searchParams?.get('token')
        const sessionToken = sessionStorage.getItem('invite_token')
        const localToken = localStorage.getItem('invite_token')
        const inviteToken = urlToken || sessionToken || localToken
        
        // 会社IDを取得
        const urlCompanyId = searchParams?.get('companyId')
        const sessionCompanyId = sessionStorage.getItem('invite_company_id')
        const localCompanyId = localStorage.getItem('invite_company_id')
        const companyIdFromUrl = urlCompanyId || sessionCompanyId || localCompanyId
        
        console.log('[DEBUG] Is invited user:', isInvited)
        console.log('[DEBUG] URL token:', urlToken)
        console.log('[DEBUG] Session token:', sessionToken)
        console.log('[DEBUG] Local token:', localToken)
        console.log('[DEBUG] Using token:', inviteToken)
        console.log('[DEBUG] URL companyId:', urlCompanyId)
        console.log('[DEBUG] Session companyId:', sessionCompanyId)
        console.log('[DEBUG] Local companyId:', localCompanyId)
        console.log('[DEBUG] Using companyId:', companyIdFromUrl)
        
        if (isInvited) {
          // 招待ユーザーの場合
          console.log('[DEBUG] Processing invited user login')
          
          if (!inviteToken) {
            console.error('No invite token found')
            setError('招待トークンが見つかりません。招待メールのリンクから再度アクセスしてください。')
            setLoading(false)
            return
          }
          
          // 招待トークンを検証
          try {
            const verifyUrl = window.location.origin + '/api/invitations/verify'
            console.log('[DEBUG] Verifying invite token:', verifyUrl)
            const response = await fetch(verifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              },
              body: JSON.stringify({ 
                token: inviteToken,
                company_id: companyIdFromUrl
              }),
            })
            
            if (!response.ok) {
              const result = await response.json()
              console.error('[DEBUG] API error verifying invitation:', result.message || 'Unknown error')
              setError('招待トークンの検証に失敗しました: ' + (result.message || 'APIエラー'))
              setLoading(false)
              return
            }
            
            const result = await response.json()
            
            if (!result.valid || !result.invitation) {
              console.error('[DEBUG] Token verification failed via API')
              setError('招待トークンが無効です')
              setLoading(false)
              return
            }
            
            console.log('[DEBUG] Invitation verified:', result.invitation)
            
            // 会社IDを取得
            const companyId = result.invitation.company_id || companyIdFromUrl
            
            if (!companyId) {
              console.error('[DEBUG] No company ID found')
              setError('会社IDが見つかりません')
              setLoading(false)
              return
            }
            
            console.log('[DEBUG] Using company ID from invitation:', companyId)
            
            // Supabaseのユーザーメタデータを更新
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                company_id: companyId,
                role: result.invitation.role || '一般ユーザー',
                status: 'アクティブ',
                isInvited: false
              }
            })
            
            if (updateError) {
              console.error('[DEBUG] Error updating user metadata:', updateError)
            } else {
              console.log('[DEBUG] User metadata updated with company ID:', companyId)
            }
            
            // ユーザー情報を更新
            const success = await updateUserAfterGoogleSignIn({
              isInvited: true,
              inviteToken,
              role: result.invitation.role || '一般ユーザー',
              companyId
            })
            
            if (success) {
              // 招待トークンをクリア
              sessionStorage.removeItem('invite_token')
              localStorage.removeItem('invite_token')
              
              // ダッシュボードにリダイレクト
              router.push('/dashboard')
            } else {
              setError('ユーザー情報の更新に失敗しました')
            }
          } catch (error) {
            console.error('[DEBUG] Error verifying invitation:', error)
            setError('招待トークンの検証中にエラーが発生しました')
            setLoading(false)
          }
        } else {
          // 通常のログイン
          const success = await loginWithGoogle()
          
          if (success) {
            // ユーザーが既存かどうかを確認
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
              setError('ユーザー情報の取得に失敗しました')
              setLoading(false)
              return
            }
            
            // Supabaseのユーザーメタデータから会社IDを取得
            const companyIdFromMetadata = user.user_metadata?.company_id
            
            if (companyIdFromMetadata) {
              // 会社IDがある場合はダッシュボードへ
              router.push('/dashboard')
            } else {
              // 会社IDがない場合は会社登録ページへ
              router.push('/auth/register/company')
            }
          } else {
            setError('ログインに失敗しました')
          }
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('認証処理中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    
    handleCallback()
  }, [router, searchParams, loginWithGoogle, updateUserAfterGoogleSignIn, users])
  
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
