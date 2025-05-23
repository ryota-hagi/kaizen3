'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface RegisterFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onCancel }) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleGoogleSignUp = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = getSupabaseClient()
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/register/callback`
        }
      })
      
      if (error) {
        setError('登録中にエラーが発生しました')
        console.error('Google sign up error:', error)
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
      
      <div className="space-y-6">
        <p className="text-secondary-600 mb-4">
          Googleアカウントを使用して登録してください。メールアドレス、氏名などの情報はGoogleアカウントから取得します。
        </p>
        
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
            />
          </svg>
          {loading ? '登録中...' : 'Googleで登録'}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full flex justify-center py-2 px-4 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mt-4"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  )
}
