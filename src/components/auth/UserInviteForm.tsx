'use client'

import React, { useState } from 'react'
import { useUser } from '@/contexts/UserContext'

interface UserInviteFormProps {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  onClose?: () => void
}

export const UserInviteForm: React.FC<UserInviteFormProps> = ({
  onSuccess,
  onError,
  onClose
}) => {
  const { inviteUser, currentUser } = useUser()
  
  // フォームの状態
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('一般ユーザー')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // 招待処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション
    if (!email) {
      setErrorMessage('メールアドレスを入力してください')
      return
    }
    
    if (!role) {
      setErrorMessage('役割を選択してください')
      return
    }
    
    if (!currentUser || !currentUser.companyId) {
      setErrorMessage('会社情報が取得できません')
      return
    }
    
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    try {
      // 招待処理を実行
      const result = await inviteUser({
        email,
        role,
        companyId: currentUser.companyId
      })
      
      if (result.success) {
        setSuccessMessage(result.message || 'ユーザーを招待しました')
        setEmail('')
        setRole('一般ユーザー')
        
        // 成功コールバックがあれば実行
        if (onSuccess) {
          onSuccess(result.message || 'ユーザーを招待しました')
        }
      } else {
        setErrorMessage(result.message || '招待処理に失敗しました')
        
        // エラーコールバックがあれば実行
        if (onError) {
          onError(result.message || '招待処理に失敗しました')
        }
      }
    } catch (error) {
      console.error('招待処理中にエラーが発生しました:', error)
      setErrorMessage('招待処理中にエラーが発生しました')
      
      // エラーコールバックがあれば実行
      if (onError) {
        onError('招待処理中にエラーが発生しました')
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-secondary-900 mb-4">ユーザーを招待</h2>
      
      {/* エラーメッセージ */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {errorMessage}
        </div>
      )}
      
      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* メールアドレス入力 */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="招待するユーザーのメールアドレス"
            required
          />
        </div>
        
        {/* 役割選択 */}
        <div className="mb-6">
          <label htmlFor="role" className="block text-sm font-medium text-secondary-700 mb-1">
            役割
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="一般ユーザー">一般ユーザー</option>
            <option value="マネージャー">マネージャー</option>
            <option value="管理者">管理者</option>
          </select>
        </div>
        
        {/* ボタン */}
        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
          )}
          
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                招待中...
              </span>
            ) : (
              '招待を送信'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
