'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, updateUserAfterGoogleSignIn } = useUser()
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
        
        if (isInvited && inviteToken) {
          // 招待ユーザーの場合
          console.log('Invited user login with token:', inviteToken)
          
          // ユーザー情報を更新
          const success = await updateUserAfterGoogleSignIn({
            isInvited: true,
            inviteToken,
            role: 'メンバー'
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
            // リダイレクト先を決定
            const redirectTo = searchParams?.get('redirectTo') || '/dashboard'
            router.push(redirectTo)
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
  }, [router, searchParams, loginWithGoogle, updateUserAfterGoogleSignIn])
  
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
