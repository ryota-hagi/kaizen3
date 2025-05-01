'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import Link from 'next/link'

export default function RegisterCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithSession } = useUser()
  
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLパラメータからOAuthプロバイダーの情報を取得
        const email = searchParams?.get('email')
        const name = searchParams?.get('name')
        const image = searchParams?.get('image')
        
        if (!email) {
          console.error('[RegisterCallback] No email found in URL params')
          setError('メールアドレスが見つかりません')
          setIsProcessing(false)
          return
        }
        
        console.log('[RegisterCallback] Processing OAuth callback:', { email, name })
        
        // ユーザー情報を登録
        const loginResult = await loginWithSession({
          email,
          name: name || email.split('@')[0],
          image,
        })
        
        if (loginResult) {
          console.log('[RegisterCallback] Login successful')
          setSuccess(true)
          
          // 会社情報登録ページにリダイレクト
          setTimeout(() => {
            router.push('/auth/register/company')
          }, 2000)
        } else {
          console.error('[RegisterCallback] Login failed')
          setError('登録に失敗しました')
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('[RegisterCallback] Error processing callback:', err)
        setError('コールバック処理中にエラーが発生しました')
        setIsProcessing(false)
      }
    }
    
    handleCallback()
  }, [router, searchParams, loginWithSession])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          アカウント登録
        </h1>
        
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-secondary-600">
              アカウント情報を処理しています...
            </p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="bg-red-50 text-red-700 p-4 rounded-md">
              {error}
            </div>
            
            <div className="flex justify-center">
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                登録ページに戻る
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
                <span>アカウント登録が完了しました。会社情報登録ページにリダイレクトします...</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
