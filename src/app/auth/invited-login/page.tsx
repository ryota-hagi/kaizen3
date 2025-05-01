'use client'

import React from 'react'
import { InvitedUserLoginForm } from '@/components/auth/InvitedUserLoginForm'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function InvitedLoginPage() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || undefined
  
  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          招待ユーザーログイン
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          招待されたユーザーはこちらからログインしてください
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <InvitedUserLoginForm inviteToken={token} />
        
        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-sm text-primary-600 hover:text-primary-500">
            通常のログインはこちら
          </Link>
        </div>
      </div>
    </div>
  )
}
