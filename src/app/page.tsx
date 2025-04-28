'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAllTestData, clearAllTestData } from '@/utils/testData'
import { debugLocalStorage } from '@/utils/localStorage'
import { LoginForm } from '@/components/auth/LoginForm'
import { useUser } from '@/contexts/UserContext'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useUser()
  
  useEffect(() => {
    // ローカルストレージの内容を確認
    console.log('ホームページがロードされました')
    debugLocalStorage()
    
    // ログイン済みの場合はマイページにリダイレクト
    if (isAuthenticated) {
      router.push('/mypage')
    }
  }, [router, isAuthenticated])
  
  // テストデータを作成する関数
  const handleCreateTestData = () => {
    createAllTestData()
    debugLocalStorage()
  }
  
  // テストデータをクリアする関数
  const handleClearTestData = () => {
    clearAllTestData()
    debugLocalStorage()
  }
  
  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* ログインフォーム */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          KAIZEN
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          アカウントにログインしてください
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
      
      {/* 開発者ツール */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-4 px-4 shadow sm:rounded-lg sm:px-10">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">開発者ツール</h2>
          
          <div className="space-y-3">
            <button
              onClick={handleCreateTestData}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              テストデータを作成
            </button>
            
            <button
              onClick={handleClearTestData}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              テストデータをクリア
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
