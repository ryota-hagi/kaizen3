'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

export default function InviteUserPage() {
  const { isAuthenticated, currentUser, inviteUser } = useUser()
  const router = useRouter()
  
  // フォームの状態
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: '',
    department: '',
    position: ''
  })
  
  // エラーと成功メッセージの状態
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // 認証状態をチェック
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    } else if (currentUser && currentUser.role !== '管理者') {
      // 管理者以外はダッシュボードにリダイレクト
      router.push('/dashboard')
    }
  }, [isAuthenticated, currentUser, router])
  
  // 認証されていない場合はローディング表示
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  // 入力値の変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (!formData.email || !formData.fullName || !formData.role) {
      setError('必須項目を入力してください')
      setLoading(false)
      return
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('有効なメールアドレスを入力してください')
      setLoading(false)
      return
    }
    
    try {
      // ユーザー招待
      const success = await inviteUser({
        username: formData.email, // メールアドレスをユーザー名として使用
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        department: formData.department || undefined,
        position: formData.position || undefined,
        companyId: currentUser.companyId,
        isInvited: true
      })
      
      if (success) {
        // 招待成功
        setSuccess(`${formData.email}に招待メールを送信しました`)
        // フォームをリセット
        setFormData({
          email: '',
          fullName: '',
          role: '',
          department: '',
          position: ''
        })
      } else {
        // 招待失敗
        setError('ユーザーの招待に失敗しました')
      }
    } catch (err) {
      setError('招待処理中にエラーが発生しました')
      console.error('Invitation error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">ユーザー招待</h1>
            <p className="text-secondary-600">
              新しいユーザーを招待して、システムへのアクセス権を付与します
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
          >
            ダッシュボードに戻る
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm max-w-2xl">
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
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
              />
            </div>
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
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
                <option value="">選択してください</option>
                <option value="管理者">管理者</option>
                <option value="マネージャー">マネージャー</option>
                <option value="一般ユーザー">一般ユーザー</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-secondary-700 mb-1">
                部署
              </label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
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
                value={formData.position}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? '処理中...' : 'ユーザーを招待'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
