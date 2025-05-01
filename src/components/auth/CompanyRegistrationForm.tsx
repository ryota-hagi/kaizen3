'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext/context'

interface CompanyRegistrationFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const CompanyRegistrationForm: React.FC<CompanyRegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const router = useRouter()
  const { users } = useUser()
  
  // 会社情報のフォーム状態
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    industry: '',
    size: '',
    address: '',
    businessDescription: '',
    foundedYear: '',
    website: '',
    contactEmail: ''
  })
  
  // エラーメッセージの状態
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // 入力値の変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCompanyInfo(prev => ({
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
    if (!companyInfo.name || !companyInfo.industry || !companyInfo.size || !companyInfo.address) {
      setError('必須項目を入力してください')
      setLoading(false)
      return
    }
    
    try {
      // 会社名の重複チェックは行わない（同じ会社名の登録は許容）
      
      // 会社情報をローカルストレージに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('kaizen_company_info', JSON.stringify(companyInfo))
      }
      
      // ダッシュボードにリダイレクト
      router.push('/dashboard')
      
    } catch (err) {
      setError('登録中にエラーが発生しました')
      console.error('Registration error:', err)
      setLoading(false)
    }
  }
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-secondary-900 mb-6">会社情報登録</h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={companyInfo.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-secondary-700 mb-1">
            業種 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="industry"
            name="industry"
            value={companyInfo.industry}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="size" className="block text-sm font-medium text-secondary-700 mb-1">
            従業員規模 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="size"
            name="size"
            value={companyInfo.size}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
            placeholder="例: 10-50人"
          />
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-secondary-700 mb-1">
            所在地 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={companyInfo.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="businessDescription" className="block text-sm font-medium text-secondary-700 mb-1">
            事業内容
          </label>
          <textarea
            id="businessDescription"
            name="businessDescription"
            value={companyInfo.businessDescription}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-secondary-700 mb-1">
            Webサイト
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={companyInfo.website}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="例: https://example.com"
          />
        </div>
        
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-secondary-700 mb-1">
            連絡先メールアドレス
          </label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            value={companyInfo.contactEmail}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="例: contact@example.com"
          />
        </div>
        
        <div className="pt-4">
          <p className="text-sm text-secondary-600 mb-4">
            会社情報を登録後、Googleアカウントで管理者登録を行います。
            個人情報（ユーザー名、メールアドレス、氏名）はGoogleアカウントから取得します。
          </p>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? '処理中...' : '登録する'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center">
        <Link href="/auth/login" className="text-sm text-primary-600 hover:text-primary-500">
          既にアカウントをお持ちの方はこちら
        </Link>
      </div>
    </div>
  )
}
