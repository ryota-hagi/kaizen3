'use client'

import React, { useEffect, useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// プリレンダを強制的にオフ
export const dynamic = 'force-dynamic'

export default function LoginPage() {
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
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <LoginForm />
          
          <div className="mt-6 text-center">
            <Link href="/auth/invited-login" className="text-sm text-primary-600 hover:text-primary-500">
              招待ユーザーのログインはこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
