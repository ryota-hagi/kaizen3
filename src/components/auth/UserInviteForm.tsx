'use client'

import React, { useState } from 'react'

interface UserInviteFormProps {
  onSubmit: (email: string, role: string) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

export const UserInviteForm: React.FC<UserInviteFormProps> = ({
  onSubmit,
  isSubmitting,
  error
}) => {
  // フォームの状態
  const [formData, setFormData] = useState({
    email: '',
    role: '一般ユーザー'
  })
  
  // 入力値の変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData.email, formData.role)
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
            placeholder="例: user@example.com"
          />
          <p className="mt-1 text-xs text-secondary-500">
            招待するユーザーのメールアドレスを入力してください
          </p>
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-secondary-700 mb-1">
            役割 <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="一般ユーザー">一般ユーザー</option>
            <option value="マネージャー">マネージャー</option>
            <option value="管理者">管理者</option>
          </select>
        </div>
      </div>
      
      <div className="pt-4">
        <p className="text-sm text-secondary-600 mb-4">
          招待メールは送信されません。招待リンクが生成されますので、そのリンクを招待するユーザーに共有してください。<br />
          ユーザーはリンクをクリックしてアカウントを有効化できます。
        </p>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? '処理中...' : 'ユーザーを招待'}
          </button>
        </div>
      </div>
    </form>
  )
}
