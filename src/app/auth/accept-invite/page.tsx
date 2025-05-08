'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyInviteToken, isAuthenticated, currentUser } = useUser()
  
  // 状態管理
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState('')
  const [invitedUser, setInvitedUser] = useState<any>(null)
  
  // トークンを取得
  const token = searchParams?.get('token') || ''
  
  // トークンの検証
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('招待トークンが見つかりません')
        setIsLoading(false)
        return
      }
      
      try {
        const result = await verifyInviteToken(token)
        
        if (result.valid && result.user) {
          setIsValid(true)
          setInvitedUser(result.user)
        } else {
          setError(result.error || '無効な招待トークンです')
        }
      } catch (error) {
        console.error('招待トークンの検証中にエラーが発生しました:', error)
        setError('招待トークンの検証中にエラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    }
    
    verifyToken()
  }, [token, verifyInviteToken])
  
  // 既にログインしている場合の処理
  useEffect(() => {
    if (isAuthenticated && currentUser && isValid) {
      // 既にログインしているユーザーが招待を受け取った場合は、招待完了ページにリダイレクト
      router.push(`/auth/accept-invite/callback?token=${token}`)
    }
  }, [isAuthenticated, currentUser, isValid, token, router])
  
  // Googleログインハンドラ
  const handleGoogleLogin = () => {
    // トークンをローカルストレージに保存して、コールバック後に取得できるようにする
    if (typeof window !== 'undefined') {
      localStorage.setItem('invite_token', token)
    }
    
    // Google認証ページにリダイレクト
    router.push('/auth/login?provider=google&invite=true')
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-red-600">招待エラー</h1>
            <p className="mt-2 text-secondary-600">{error}</p>
          </div>
          <div className="mt-6">
            <Link
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">招待を受け取りました</h1>
          {invitedUser && (
            <p className="mt-2 text-secondary-600">
              {invitedUser.email}さん、{invitedUser.companyId}の{invitedUser.role}として招待されています。
            </p>
          )}
        </div>
        
        <div className="mt-8">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 border-secondary-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Googleアカウントでログイン
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-secondary-500">
            招待を受け取るには、Googleアカウントでログインしてください。
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
