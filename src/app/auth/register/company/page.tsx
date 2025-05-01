'use client'

import React from 'react'
import { CompanyRegistrationForm } from '@/components/auth/CompanyRegistrationForm'
import Link from 'next/link'

export default function CompanyRegisterPage() {
  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          会社情報登録
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          会社情報を入力して登録を完了してください
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <CompanyRegistrationForm />
      </div>
    </div>
  )
}
