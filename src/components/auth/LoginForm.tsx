'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

interface LoginFormProps {
  onSuccess?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // URLからinvite_tokenパラメータを取得
  useEffect(() => {
    const inviteToken = searchParams.get('token')
    if (inviteToken) {
      // セッションストレージに招待トークンを保存
      sessionStorage.setItem('invite_token', inviteToken)
      console.log('招待トークンを保存しました:', inviteToken)
    }
  }, [searchParams])
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const client = supabase()
      
      // 招待トークンがURLに含まれている場合は保存
      const inviteToken = searchParams.get('token')
      
      if (inviteToken) {
        // セッションストレージに招待トークンを保存
        sessionStorage.setItem('invite_token', inviteToken)
        console.log('招待トークンを保存しました:', inviteToken)
      }
      
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_URL || window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        setError('ログイン中にエラーが発生しました')
        console.error('Google login error:', error)
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
            />
          </svg>
          {loading ? 'ログイン中...' : 'Googleでログイン'}
        </button>
      </div>
    </>
  )
}
