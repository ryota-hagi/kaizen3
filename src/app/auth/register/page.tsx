'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CompanyInfo } from '@/utils/api'
import { useUser } from '@/contexts/UserContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useUser()
  
  const [step, setStep] = useState<'company' | 'admin'>('company')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // 会社情報
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    industry: '',
    size: '',
    address: '',
    businessDescription: '',
    foundedYear: '',
    website: '',
    contactEmail: ''
  })
  
  // 管理者情報
  const [adminInfo, setAdminInfo] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  
  // 会社情報の変更ハンドラ
  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // 管理者情報の変更ハンドラ
  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setAdminInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // 会社情報の送信ハンドラ
  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション
    if (!companyInfo.name || !companyInfo.industry || !companyInfo.size || !companyInfo.address) {
      setError('必須項目を入力してください')
      return
    }
    
    // 会社情報をローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('kaizen_company_info', JSON.stringify(companyInfo))
    }
    
    // 次のステップへ
    setError(null)
    setStep('admin')
  }
  
  // 管理者情報の送信ハンドラ
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // バリデーション
    if (!adminInfo.username || !adminInfo.email || !adminInfo.password || !adminInfo.fullName) {
      setError('必須項目を入力してください')
      setLoading(false)
      return
    }
    
    // パスワード確認
    if (adminInfo.password !== adminInfo.confirmPassword) {
      setError('パスワードが一致しません')
      setLoading(false)
      return
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminInfo.email)) {
      setError('有効なメールアドレスを入力してください')
      setLoading(false)
      return
    }
    
    try {
      // 管理者ユーザーを登録
      const success = await register(
        {
          username: adminInfo.username,
          email: adminInfo.email,
          fullName: adminInfo.fullName,
          role: '管理者', // 管理者権限
          companyId: companyInfo.name // 会社名をIDとして使用
        },
        adminInfo.password
      )
      
      if (success) {
        // 登録成功
        router.push('/dashboard')
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
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          {step === 'company' ? '会社登録' : '管理者登録'}
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          {step === 'company' 
            ? 'まずは会社情報を登録してください' 
            : '管理者アカウントを作成してください'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {step === 'company' ? (
            <form onSubmit={handleCompanySubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={companyInfo.name}
                    onChange={handleCompanyChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-secondary-700">
                  業種 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="industry"
                    name="industry"
                    type="text"
                    value={companyInfo.industry}
                    onChange={handleCompanyChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="size" className="block text-sm font-medium text-secondary-700">
                  従業員規模 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="size"
                    name="size"
                    type="text"
                    value={companyInfo.size}
                    onChange={handleCompanyChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-secondary-700">
                  所在地 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={companyInfo.address}
                    onChange={handleCompanyChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessDescription" className="block text-sm font-medium text-secondary-700">
                  事業内容
                </label>
                <div className="mt-1">
                  <textarea
                    id="businessDescription"
                    name="businessDescription"
                    rows={3}
                    value={companyInfo.businessDescription}
                    onChange={handleCompanyChange}
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-secondary-700">
                  連絡先メール
                </label>
                <div className="mt-1">
                  <input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={companyInfo.contactEmail || ''}
                    onChange={handleCompanyChange}
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  次へ
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-secondary-700">
                  ユーザー名 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={adminInfo.username}
                    onChange={handleAdminChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={adminInfo.email}
                    onChange={handleAdminChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={adminInfo.fullName}
                    onChange={handleAdminChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={adminInfo.password}
                    onChange={handleAdminChange}
                    required
                    minLength={6}
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700">
                  パスワード（確認） <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={adminInfo.confirmPassword}
                    onChange={handleAdminChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('company')}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  会社情報に戻る
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? '登録中...' : '登録する'}
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-secondary-500">
                  既にアカウントをお持ちの方
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/auth/login"
                className="w-full flex justify-center py-2 px-4 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                ログイン
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
