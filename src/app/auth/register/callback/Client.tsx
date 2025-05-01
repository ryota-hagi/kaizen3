'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function RegisterCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updateUserAfterGoogleSignIn } = useUser()
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
        
        // ユーザー情報を更新
        const success = await updateUserAfterGoogleSignIn({
          role: '管理者'
        })
        
        if (success) {
          // 会社情報登録ページにリダイレクト
          router.push('/auth/register/company')
        } else {
          setError('ユーザー情報の更新に失敗しました')
        }
      } catch (err) {
        console.error('Register callback error:', err)
        setError('登録処理中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    
    handleCallback()
  }, [router, updateUserAfterGoogleSignIn])
  
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
              onClick={() => router.push('/auth/register')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              登録ページに戻る
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
          登録処理中...
        </h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-secondary-600">
            登録情報を処理しています...
          </p>
        </div>
      </div>
    </div>
  )
}
