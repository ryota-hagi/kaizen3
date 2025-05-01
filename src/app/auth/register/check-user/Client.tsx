'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useUser } from '@/contexts/UserContext/context'

export default function CheckUserClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { users, loginWithSession } = useUser()
  
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 追加ユーザーモードかどうかを確認
  const isAddingUser = searchParams?.get('isAddingUser') === 'true'
  const companyId = searchParams?.get('companyId') || ''
  
  useEffect(() => {
    const checkUser = async () => {
      if (status === 'loading') {
        return
      }
      
      if (status === 'unauthenticated' || !session?.user?.email) {
        router.push('/auth/login')
        return
      }
      
      console.log('Session user:', session.user)
      console.log('Is adding user:', isAddingUser)
      console.log('Company ID:', companyId)
      
      try {
        // 既存ユーザーかどうかをチェック
        const existingUser = users.find(user => user.email === session.user.email)
        
        if (existingUser) {
          if (isAddingUser) {
            // 既に存在するユーザーを追加しようとした場合
            setError('このGoogleアカウントは既に登録されています')
            setIsChecking(false)
            
            // 3秒後にユーザー一覧ページに戻る
            setTimeout(() => {
              router.push('/dashboard/users')
            }, 3000)
            return
          } else {
            // 通常のログインフロー
            const success = await loginWithSession(session.user)
            if (success) {
              router.push('/dashboard')
            } else {
              setError('ログインに失敗しました')
              setIsChecking(false)
            }
            return
          }
        }
        
        // 新規ユーザーの場合
        if (isAddingUser) {
          // 管理者が追加するモード
          if (!companyId) {
            setError('会社IDが指定されていません')
            setIsChecking(false)
            
            // 3秒後にユーザー一覧ページに戻る
            setTimeout(() => {
              router.push('/dashboard/users')
            }, 3000)
            return
          }
          
          // セッション情報に会社IDを追加
          const userWithCompany = {
            ...session.user,
            companyId: decodeURIComponent(companyId),
            role: '一般ユーザー' // デフォルトの役割
          }
          
          // ユーザーを追加
          const success = await loginWithSession(userWithCompany)
          
          if (success) {
            // 成功メッセージを表示して、ユーザー一覧ページに戻る
            setIsChecking(false)
            
            // 3秒後にユーザー一覧ページに戻る
            setTimeout(() => {
              router.push('/dashboard/users')
            }, 3000)
          } else {
            setError('ユーザーの追加に失敗しました')
            setIsChecking(false)
          }
        } else {
          // 通常の新規登録フロー
          router.push('/auth/register/company')
        }
      } catch (err) {
        console.error('Error during user check:', err)
        setError('ユーザー確認中にエラーが発生しました')
        setIsChecking(false)
      }
    }
    
    checkUser()
  }, [status, session, router, users, loginWithSession, isAddingUser, companyId])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          {isAddingUser ? 'ユーザー追加中' : 'ユーザー確認中'}
        </h1>
        
        {isChecking ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-secondary-600">
              {isAddingUser ? 'ユーザーを追加しています...' : 'Googleアカウント情報を確認しています...'}
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        ) : isAddingUser ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>ユーザーが正常に追加されました。ユーザー一覧ページに戻ります...</span>
            </div>
          </div>
        ) : null}
        
        {!isChecking && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              ユーザー一覧に戻る
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
