'use client'

import React from 'react';
import Link from 'next/link';

export default function InvalidInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">招待リンクが無効です</h1>
          <div className="mb-6 text-gray-600">
            <p>このリンクは期限切れか、すでに使用されています。</p>
            <p className="mt-2">新しい招待リンクが必要な場合は、管理者にお問い合わせください。</p>
          </div>
          <Link 
            href="/auth/login" 
            className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
          >
            ログイン画面へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
