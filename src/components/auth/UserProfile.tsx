'use client'

import React, { useState } from 'react'
import { useUser } from '@/contexts/UserContext/context' // パスを更新
import { UserInfo } from '@/utils/api'

interface UserProfileProps {
  onLogout?: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onLogout }) => {
  const { currentUser, updateUserProfile, logout } = useUser()
  
  // 編集モードの状態
  const [isEditing, setIsEditing] = useState(false)
  
  // フォームの状態
  const [formData, setFormData] = useState<Partial<UserInfo>>(
    currentUser ? {
      fullName: currentUser.fullName,
      email: currentUser.email,
      department: currentUser.department || '',
      position: currentUser.position || ''
    } : {}
  )
  
  // エラーメッセージの状態
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // 入力値の変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // エラーをクリア
    setError(null)
  }
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    // バリデーション
    if (!formData.fullName || !formData.email) {
      setError('氏名とメールアドレスは必須です')
      setLoading(false)
      return
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      setError('有効なメールアドレスを入力してください')
      setLoading(false)
      return
    }
    
    try {
      // プロフィール更新
      const success = await updateUserProfile(formData)
      
      if (success) {
        // 更新成功
        setSuccess('プロフィールを更新しました')
        setIsEditing(false)
      } else {
        // 更新失敗
        setError('プロフィールの更新に失敗しました')
      }
    } catch (err) {
      setError('更新中にエラーが発生しました')
      console.error('Profile update error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // ログアウト処理
  const handleLogout = async () => {
    try {
      logout()
      if (onLogout) {
        onLogout()
      }
      // ログアウト後にリダイレクト
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('ログアウト中にエラーが発生しました:', error)
    }
  }
  
  // 編集キャンセル
  const handleCancel = () => {
    // フォームデータをリセット
    if (currentUser) {
      setFormData({
        fullName: currentUser.fullName,
        email: currentUser.email,
        department: currentUser.department || '',
        position: currentUser.position || ''
      })
    }
    setIsEditing(false)
    setError(null)
  }
  
  // ユーザーが存在しない場合
  if (!currentUser) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <p className="text-secondary-600">ユーザー情報が見つかりません。ログインしてください。</p>
      </div>
    )
  }
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-secondary-900">ユーザープロフィール</h2>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition-colors"
            >
              編集
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition-colors"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-secondary-700 mb-1">
              部署
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-secondary-700 mb-1">
              役職
            </label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? '更新中...' : '保存'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-secondary-500">ユーザーID</h3>
              <p className="text-secondary-900">{currentUser.username}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-500">氏名</h3>
              <p className="text-secondary-900">{currentUser.fullName}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-500">メールアドレス</h3>
              <p className="text-secondary-900">{currentUser.email}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-500">役割</h3>
              <p className="text-secondary-900">{currentUser.role}</p>
            </div>
            
            {currentUser.department && (
              <div>
                <h3 className="text-sm font-medium text-secondary-500">部署</h3>
                <p className="text-secondary-900">{currentUser.department}</p>
              </div>
            )}
            
            {currentUser.position && (
              <div>
                <h3 className="text-sm font-medium text-secondary-500">役職</h3>
                <p className="text-secondary-900">{currentUser.position}</p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-secondary-500">登録日</h3>
              <p className="text-secondary-900">
                {new Date(currentUser.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
            
            {currentUser.lastLogin && (
              <div>
                <h3 className="text-sm font-medium text-secondary-500">最終ログイン</h3>
                <p className="text-secondary-900">
                  {new Date(currentUser.lastLogin).toLocaleDateString('ja-JP')} {new Date(currentUser.lastLogin).toLocaleTimeString('ja-JP')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
