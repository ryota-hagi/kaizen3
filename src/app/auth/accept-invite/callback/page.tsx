'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

export default function AcceptInviteCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, currentUser, completeInvitation } = useUser()
  
  // 状態管理
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fullName, setFullName] = useState('')
  
  // トークンを取得（URLパラメータまたはローカルストレージから）
  const tokenFromUrl = searchParams?.get('token') || ''
  const [token, setToken] = useState(tokenFromUrl)
  
  // ローカルストレージからトークンを取得
  useEffect(() => {
    if (!tokenFromUrl && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('invite_token')
      if (storedToken) {
        setToken(storedToken)
      }
    }
    
    setIsLoading(false)
  }, [tokenFromUrl])
  
  // 認証状態をチェック
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      // 認証されていない場合は、ログインページにリダイレクト
      router.push('/auth/login')
    }
  }, [isAuthenticated, currentUser, router])
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError('招待トークンが見つかりません')
      return
    }
    
    if (!fullName) {
      setError('氏名を入力してください')
      return
    }
    
    setIsCompleting(true)
    setError('')
    
    try {
      // 招待完了処理を実行
      const result = await completeInvitation(token, { fullName })
      
      if (result) {
        setSuccess(true)
        
        // ローカルストレージからトークンを削除
        if (typeof window !== 'undefined') {
          localStorage.removeItem('invite_token')
        }
        
        // 3秒後にダッシュボードにリダイレクト
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } else {
        setError('招待の完了に失敗しました')
      }
    } catch (error) {
      console.error('招待完了処理中にエラーが発生しました:', error)
      setError('招待完了処理中にエラーが発生しました')
    } finally {
      setIsCompleting(false)
    }
  }
  
  if (isLoading || !isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-secondary-900">招待完了</h1>
            <p className="mt-2 text-secondary-600">
              招待の受け入れが完了しました。ダッシュボードにリダイレクトします...
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-red-600">招待エラー</h1>
            <p className="mt-2 text-secondary-600">招待トークンが見つかりません</p>
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
          <h1 className="text-2xl font-bold text-secondary-900">招待を完了する</h1>
          <p className="mt-2 text-secondary-600">
            あと少しで完了です。以下の情報を入力してください。
          </p>
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* 氏名入力 */}
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700 mb-1">
              氏名
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 山田 太郎"
              required
            />
          </div>
          
          {/* メールアドレス（表示のみ） */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={currentUser.email}
              className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-md"
              disabled
            />
            <p className="mt-1 text-xs text-secondary-500">
              このメールアドレスで招待を受け取りました
            </p>
          </div>
          
          {/* 送信ボタン */}
          <div className="mt-6">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isCompleting}
            >
              {isCompleting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : (
                '招待を完了する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
