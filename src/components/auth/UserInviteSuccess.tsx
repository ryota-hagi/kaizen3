'use client'

import React from 'react'
import Link from 'next/link'

interface UserInviteSuccessProps {
  inviteLink: string | null
  onReset: () => void
  copyInviteLink: () => void
}

export const UserInviteSuccess: React.FC<UserInviteSuccessProps> = ({
  inviteLink,
  onReset,
  copyInviteLink
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>ユーザーを招待しました</span>
        </div>
      </div>
      
      {inviteLink && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">招待リンク</h3>
          <p className="text-secondary-600 text-sm">
            以下の招待リンクを招待したユーザーに共有してください。ユーザーはこのリンクからアカウントを有効化できます。
          </p>
          
          <div className="flex items-center">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 px-3 py-2 border border-secondary-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={copyInviteLink}
              className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
            >
              コピー
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-6">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
        >
          別のユーザーを招待
        </button>
        
        <Link
          href="/dashboard/users"
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          ユーザー一覧に戻る
        </Link>
      </div>
    </div>
  )
}
