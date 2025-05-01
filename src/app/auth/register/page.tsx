'use client'

import React from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function RegisterPage() {
  // Google認証ハンドラ
  const handleGoogleSignIn = async () => {
    await signIn('google', {
      callbackUrl: '/auth/register/check-user', // 認証後にユーザーチェックページにリダイレクト
      redirect: true,
    })
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          新規登録
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          Googleアカウントで認証後、会社情報を登録してください
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="space-y-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center px-4 py-2 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="#4285F4"
                />
              </svg>
              Googleで登録する
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-primary-600 hover:text-primary-500">
              既にアカウントをお持ちの方はこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
