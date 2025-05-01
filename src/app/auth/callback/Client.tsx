'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { getSupabaseClient } from '@/lib/supabaseClient'

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
          console.error('Error getting session:', error)
          setError('認証中にエラーが発生しました')
          setLoading(false)
          return
        }
        
        if (!data.session) {
          console.error('No session found')
          setError('セッションが見つかりません')
          setLoading(false)
          return
        }
        
        // 招待ユーザーかどうかを確認
        const isInvited = searchParams?.get('invite') === 'true'
        const inviteToken = sessionStorage.getItem('invite_token')
        
        console.log('[DEBUG] Is invited user:', isInvited)
        console.log('[DEBUG] Invite token from sessionStorage:', inviteToken)
        console.log('[DEBUG] Total users in context:', users.length)
        
        // 全ユーザーのトークンをログに出力
        users.forEach((user, index) => {
          console.log(`[DEBUG] User ${index} token:`, user.inviteToken, 'isInvited:', user.isInvited, 'status:', user.status)
        })
        
        if (isInvited) {
          // 招待ユーザーの場合
          console.log('[DEBUG] Processing invited user login with token:', inviteToken)
          
          if (!inviteToken) {
            console.error('No invite token found')
            setError('招待トークンが見つかりません。招待メールのリンクから再度アクセスしてください。')
            setLoading(false)
            return
          }
          
          // ローカルストレージから招待ユーザーを検索（大文字小文字を区別せず比較）
          const invitedUser = users.find(user => 
            (user.inviteToken && inviteToken && 
             user.inviteToken.toLowerCase() === inviteToken.toLowerCase()) && 
            (user.status === '招待中' || user.isInvited === true)
          )
          
          if (!invitedUser) {
            console.error('[DEBUG] No invited user found with token:', inviteToken)
            console.log('[DEBUG] Trying to find user with token only...')
            
            // トークンのみで検索（ステータスを無視）
            const userByTokenOnly = users.find(user => 
              user.inviteToken && inviteToken && 
              user.inviteToken.toLowerCase() === inviteToken.toLowerCase()
            )
            
            if (userByTokenOnly) {
              console.log('[DEBUG] Found user by token only:', userByTokenOnly.email)
              console.log('[DEBUG] User status:', userByTokenOnly.status)
              console.log('[DEBUG] User isInvited:', userByTokenOnly.isInvited)
              console.log('[DEBUG] User company ID:', userByTokenOnly.companyId)
              
              // 会社IDを取得
              const companyId = userByTokenOnly.companyId
              
              if (!companyId) {
                console.error('[DEBUG] No company ID found for user')
                setError('招待ユーザーの会社情報が見つかりません。')
                setLoading(false)
                return
              }
              
              console.log('[DEBUG] Using company ID:', companyId)
              
              // ユーザー情報を更新
              const success = await updateUserAfterGoogleSignIn({
                isInvited: true,
                inviteToken,
                role: 'メンバー',
                companyId
              })
              
              if (success) {
                // 招待トークンをクリア
                sessionStorage.removeItem('invite_token')
                
                // ダッシュボードにリダイレクト
                router.push('/dashboard')
              } else {
                setError('ユーザー情報の更新に失敗しました')
              }
              
              return
            }
            
            setError('招待ユーザーが見つかりません。招待メールのリンクから再度アクセスしてください。')
            setLoading(false)
            return
          }
          
          // 招待ユーザーの会社IDを取得
          const companyId = invitedUser.companyId
          
          if (!companyId) {
            console.error('[DEBUG] No company ID found for invited user')
            setError('招待ユーザーの会社情報が見つかりません。')
            setLoading(false)
            return
          }
          
          console.log('[DEBUG] Found invited user with company ID:', companyId)
          
          // ユーザー情報を更新
          const success = await updateUserAfterGoogleSignIn({
            isInvited: true,
            inviteToken,
            role: 'メンバー',
            companyId // 招待ユーザーの会社IDを設定
          })
          
          if (success) {
            // 招待トークンをクリア
            sessionStorage.removeItem('invite_token')
            
            // ダッシュボードにリダイレクト
            router.push('/dashboard')
          } else {
            setError('ユーザー情報の更新に失敗しました')
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
            
            // ローカルストレージからユーザーリストを取得
            const usersJson = localStorage.getItem('kaizen_users')
            const localUsers = usersJson ? JSON.parse(usersJson) : []
            
            // ユーザーが既存かどうかを確認（ユーザーIDで検索）
            const existingUser = localUsers.find((u: any) => u.user && u.user.id === user.id)
            
            if (existingUser && existingUser.user.companyId) {
              // 既存ユーザーで会社IDがある場合はダッシュボードへ
              router.push('/dashboard')
            } else {
              // 新規ユーザーまたは会社IDがない場合は会社登録ページへ
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
