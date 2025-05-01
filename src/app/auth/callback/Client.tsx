'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useUser } from '@/contexts/UserContext/context'
import Link from 'next/link'

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithSession } = useUser()
  
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // URLパラメータを取得
  const companyId = searchParams?.get('companyId')
  const role = searchParams?.get('role')
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabaseクライアントを取得
        const supabase = getSupabaseClient();
        
        // Supabaseのセッション情報を取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[Callback] Error getting session:', sessionError)
          setError('セッションの取得に失敗しました')
          setIsProcessing(false)
          return
        }
        
        if (!session) {
          console.error('[Callback] No session found')
          setError('セッションが見つかりません')
          setIsProcessing(false)
          return
        }
        
        console.log('[Callback] Session found:', session.user.email)
        
        // ユーザー情報を取得
        const userData = {
          email: session.user.email!,
          fullName: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
          role: role || '一般ユーザー',
          companyId: companyId || '株式会社ariGaT',
        }
        
        console.log('[Callback] User data:', userData)
        
        // NextAuth.jsのセッションを作成（既存のログイン処理を使用）
        const loginResult = await loginWithSession({
          email: userData.email,
          name: userData.fullName,
          image: session.user.user_metadata?.avatar_url,
        })
        
        if (loginResult) {
          console.log('[Callback] Login successful')
          setSuccess(true)
          
          // 3秒後にダッシュボードにリダイレクト
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        } else {
          console.error('[Callback] Login failed')
          setError('ログインに失敗しました')
        }
      } catch (err) {
        console.error('[Callback] Error processing callback:', err)
        setError('コールバック処理中にエラーが発生しました')
      } finally {
        setIsProcessing(false)
      }
    }
    
    handleCallback()
  }, [router, companyId, role, loginWithSession, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          認証コールバック
        </h1>
        
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-secondary-600">
              認証情報を処理しています...
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
                <span>認証が完了しました。ダッシュボードにリダイレクトします...</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
