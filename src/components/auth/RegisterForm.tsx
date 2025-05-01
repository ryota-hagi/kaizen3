'use client'

import React, { useState } from 'react'
import { useUser } from '@/contexts/UserContext/context' // パスを更新
import { useRouter } from 'next/navigation'

interface RegisterFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onCancel }) => {
  const { register } = useUser()
  const router = useRouter()
  
  // フォームの状態
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: '',
    department: '',
    position: ''
  })
  
  // エラーメッセージの状態
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
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
    
    // バリデーション
    if (!formData.username || !formData.email || !formData.password || !formData.fullName || !formData.role) {
      setError('必須項目を入力してください')
      setLoading(false)
      return
    }
    
    // パスワード確認
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
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
      // 会社情報を取得（ローカルストレージから）
      let companyId = 'default-company';
      if (typeof window !== 'undefined') {
        const savedCompanyInfo = localStorage.getItem('kaizen_company_info');
        if (savedCompanyInfo) {
          try {
            const parsedCompanyInfo = JSON.parse(savedCompanyInfo);
            companyId = parsedCompanyInfo.name;
          } catch (error) {
            console.error('Failed to parse company info from localStorage:', error);
          }
        }
      }
      
      // ユーザー登録
      const success = await register(
        {
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          companyId: companyId,
          department: formData.department || undefined,
          position: formData.position || undefined,
          inviteToken: '' // 空の招待トークンを設定
        },
        formData.password
      )
      
      if (success) {
        // 登録成功
        if (onSuccess) {
          onSuccess()
        } else {
          // マイページにリダイレクト
          router.push('/mypage')
        }
      } else {
        // 登録失敗
        setError('ユーザー名またはメールアドレスが既に使用されています')
      }
    } catch (err) {
      setError('登録中にエラーが発生しました')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-secondary-900 mb-6">ユーザー登録</h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-1">
            ユーザー名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
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
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
            パスワード <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
            minLength={6}
          />
          <p className="text-xs text-secondary-500 mt-1">6文字以上で入力してください</p>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
            パスワード（確認） <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
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
        
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex-1 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? '登録中...' : '登録する'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors flex-1"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
