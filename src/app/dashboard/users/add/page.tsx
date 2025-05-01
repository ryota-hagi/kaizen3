'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useUser } from '@/contexts/UserContext/context'
import Link from 'next/link'

export default function AddUserPage() {
  const router = useRouter()
  const { currentUser, inviteUser } = useUser()
  
  // フォームの状態
  const [formData, setFormData] = useState({
    email: '',
    role: '一般ユーザー'
  })
  
  // エラーと成功メッセージの状態
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)
    setInviteLink(null)
    
    // バリデーション
    if (!formData.email) {
      setError('メールアドレスを入力してください')
      setIsSubmitting(false)
      return
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('有効なメールアドレスを入力してください')
      setIsSubmitting(false)
      return
    }
    
    try {
      // 会社情報を取得
      let companyId = '株式会社サンプル'
      if (currentUser && currentUser.companyId) {
        companyId = currentUser.companyId
      }
      
      // ユーザー招待
      const result = await inviteUser({
        email: formData.email,
        role: formData.role,
        companyId: companyId
      })
      
      if (result.success) {
        setSuccess(true)
        
        // 招待リンクを生成
        if (result.inviteToken) {
          const baseUrl = window.location.origin
          const inviteUrl = `${baseUrl}/auth/invited-login?token=${result.inviteToken}`
          setInviteLink(inviteUrl)
        }
        
        // フォームをリセット
        setFormData({
          email: '',
          role: '一般ユーザー'
        })
      } else {
        setError(result.message || 'ユーザー招待に失敗しました')
      }
    } catch (err) {
      console.error('Error inviting user:', err)
      setError('ユーザー招待中にエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 招待リンクのコピー
  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          alert('招待リンクをクリップボードにコピーしました')
        })
        .catch(err => {
          console.error('クリップボードへのコピーに失敗しました:', err)
        })
    }
  }
  
  // 管理者以外はダッシュボードにリダイレクト
  useEffect(() => {
    if (currentUser && currentUser.role !== '管理者') {
      router.push('/dashboard')
    }
  }, [currentUser, router])
  
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">ユーザー招待</h1>
            <p className="text-secondary-600">
              新しいユーザーを会社アカウントに招待します
            </p>
          </div>
          <div>
            <Link
              href="/dashboard/users"
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
            >
              ユーザー一覧に戻る
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {success ? (
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
                  onClick={() => {
                    setSuccess(false)
                    setInviteLink(null)
                  }}
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
          ) : (
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
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
