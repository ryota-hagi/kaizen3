'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { completeInvitation, isAuthenticated, currentUser } = useUser()
  
  // 状態管理
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  
  // トークンを取得
  const token = searchParams?.get('token') || ''
  
  // ローカルストレージからトークンを取得（Google認証後のリダイレクトの場合）
  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('invite_token')
      if (storedToken) {
        router.replace(`/auth/accept-invite/callback?token=${storedToken}`)
      }
    }
  }, [token, router])
  
  // 認証状態の確認
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setError('ログインが必要です')
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, currentUser])
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError('招待トークンが見つかりません')
      return
    }
    
    if (!fullName.trim()) {
      setError('氏名を入力してください')
      return
    }
    
    setIsLoading(true)
    
    try {
      const success = await completeInvitation(token, { fullName })
      
      if (success) {
        setIsCompleted(true)
        
        // ローカルストレージからトークンを削除
        if (typeof window !== 'undefined') {
          localStorage.removeItem('invite_token')
        }
        
        // ダッシュボードにリダイレクト
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError('招待の完了に失敗しました')
      }
    } catch (error) {
      console.error('招待完了中にエラーが発生しました:', error)
      setError('招待完了中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
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
            <h1 className="text-2xl font-bold text-red-600">エラー</h1>
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
  
  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-green-600">招待完了</h1>
            <p className="mt-2 text-secondary-600">招待の受け入れが完了しました。ダッシュボードにリダイレクトします...</p>
          </div>
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
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
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700">
              氏名
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="山田 太郎"
              required
            />
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              招待を完了する
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
