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
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('一般ユーザー')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  
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
    
    // 招待処理開始
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    setInviteLink('')
    
    // 招待データを準備
    const inviteData = {
      email,
      fullName,
      role,
      companyId: currentUser.companyId
    };
    
    // 招待処理のタイムアウト設定（30秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('招待処理がタイムアウトしました')), 30000);
    });
    
    try {
      // 招待処理を実行（タイムアウト付き）
      const result = await Promise.race([
        inviteUser(inviteData),
        timeoutPromise
      ]) as {success: boolean, message?: string, inviteToken?: string};
      
      // 招待処理の結果を処理
      if (result.success) {
        // 招待リンクを生成して表示（即時）
        if (result.inviteToken) {
          const baseUrl = window.location.origin;
          const inviteUrl = `${baseUrl}/auth/accept-invite?token=${result.inviteToken}`;
          setInviteLink(inviteUrl);
          
          // フォームをリセット
          setEmail('')
          setFullName('')
          setRole('一般ユーザー')
          
          // 成功メッセージを表示
          setSuccessMessage(result.message || 'ユーザーを招待しました');
          
          // モーダルは閉じずに招待リンクを表示したままにする
          // 成功コールバックは呼び出さない
        } else {
          // トークンがない場合はエラー
          throw new Error('招待トークンが生成されませんでした');
        }
      } else {
        // エラーメッセージを表示
        setErrorMessage(result.message || '招待処理に失敗しました');
        
        // エラーコールバックがあれば実行
        if (onError) {
          onError(result.message || '招待処理に失敗しました');
        }
      }
    } catch (error) {
      // エラーハンドリング
      console.error('招待処理中にエラーが発生しました:', error);
      
      // エラーメッセージを表示
      const errorMsg = error instanceof Error ? error.message : '招待処理中にエラーが発生しました';
      setErrorMessage(errorMsg);
      
      // エラーコールバックがあれば実行
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      // 処理完了
      setIsSubmitting(false);
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
      
      {/* 招待リンク */}
      {inviteLink && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">招待リンク</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 p-2 text-sm bg-white border border-blue-300 rounded-md"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                alert('招待リンクをクリップボードにコピーしました');
              }}
              className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-blue-600">
            このリンクを招待したいユーザーに共有してください。リンクは7日間有効です。
          </p>
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
        
        {/* 名前入力 */}
        <div className="mb-4">
          <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700 mb-1">
            名前
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="招待するユーザーの名前"
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
