'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { debugLocalStorage } from '@/utils/localStorage'

interface LoginFormProps {
  onSuccess?: () => void
  onRegisterClick?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onRegisterClick }) => {
  const { login } = useUser()
  const router = useRouter()
  
  // フォームの状態
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  
  // エラーメッセージの状態
  const [error, setError] = useState<string | null>(null)
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
  
  // デバッグ用：コンポーネントマウント時にローカルストレージの内容を表示
  useEffect(() => {
    console.log('LoginForm: コンポーネントがマウントされました');
    debugLocalStorage();
  }, []);

  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    console.log('ログイン試行:', formData.username);
    
    // バリデーション
    if (!formData.username || !formData.password) {
      setError('ユーザーIDとパスワードを入力してください')
      setLoading(false)
      return
    }
    
    try {
      // デバッグ用：ログイン前にローカルストレージの内容を表示
      debugLocalStorage();
      
      // ログイン処理
      const success = await login(formData.username, formData.password)
      
      if (success) {
        // ログイン成功
        console.log('ログイン成功:', formData.username);
        
        if (onSuccess) {
          onSuccess()
        } else {
          // マイページにリダイレクト
          router.push('/mypage')
        }
      } else {
        // ログイン失敗
        console.log('ログイン失敗:', formData.username);
        setError('ユーザーIDまたはパスワードが正しくありません')
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // 新規登録ボタンのクリックハンドラ
  const handleRegisterClick = () => {
    if (onRegisterClick) {
      onRegisterClick()
    } else {
      router.push('/auth/register')
    }
  }
  
  return (
    <div className="max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-secondary-900 mb-6">ログイン</h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-1">
            ユーザーID
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
          <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
            パスワード
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-secondary-600">
          アカウントをお持ちでない場合は
          <button
            onClick={handleRegisterClick}
            className="text-primary-600 hover:text-primary-800 ml-1 font-medium"
          >
            新規登録
          </button>
        </p>
      </div>
    </div>
  )
}
