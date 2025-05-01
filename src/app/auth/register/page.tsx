'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          新規登録
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          アカウント情報を入力して登録してください
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <RegisterForm onSuccess={() => router.push('/auth/register/company')} />
          
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
