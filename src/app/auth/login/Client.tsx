'use client'

import React, { useEffect, useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // URLパラメータからエラーメッセージを取得
    const errorParam = searchParams?.get('error')
    if (errorParam === 'already_registered') {
      setError('このGoogleアカウントは既に登録されています。ログインしてください。')
    } else if (errorParam === 'company_already_registered') {
      setError('この会社名は既に登録されています。ログインしてください。')
    }
  }, [searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          ログイン
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <LoginForm />
        
        <div className="mt-4 text-center text-secondary-600">
          <p>
            アカウントをお持ちでない場合は{' '}
            <Link href="/auth/register" className="text-primary-600 hover:text-primary-700">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
