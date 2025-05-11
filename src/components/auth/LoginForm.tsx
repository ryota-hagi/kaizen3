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
  const [isMobile, setIsMobile] = useState(false)
  
  // 画面サイズの変更を検知
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // md ブレークポイント
    }
    
    // 初期チェック
    checkIfMobile()
    
    // リサイズイベントのリスナーを追加
    window.addEventListener('resize', checkIfMobile)
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])
  
  // URLからinvite_tokenパラメータを取得
  useEffect(() => {
    const inviteToken = searchParams.get('token')
    const isInvite = searchParams.get('invite') === 'true'
    
    if (inviteToken) {
      // ローカルストレージとセッションストレージの両方に招待トークンを保存
      localStorage.setItem('invite_token', inviteToken)
      try { sessionStorage.setItem('invite_token', inviteToken) } catch(e){}
      console.log('招待トークンを保存しました:', inviteToken)
    }
    
    // 招待フラグがある場合は保存
    if (isInvite) {
      localStorage.setItem('is_invite', 'true')
      try { sessionStorage.setItem('is_invite', 'true') } catch(e){}
      console.log('招待フラグを保存しました')
    }
  }, [searchParams])
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const client = supabase()
      
      // 招待関連のパラメータを処理
      const inviteToken = searchParams.get('token')
      const isInvite = searchParams.get('invite') === 'true'
      
      if (inviteToken) {
        // ローカルストレージとセッションストレージの両方に招待トークンを保存
        localStorage.setItem('invite_token', inviteToken)
        try { sessionStorage.setItem('invite_token', inviteToken) } catch(e){}
        console.log('招待トークンを保存しました:', inviteToken)
      }
      
      // 招待フラグがある場合は保存
      if (isInvite) {
        localStorage.setItem('is_invite', 'true')
        try { sessionStorage.setItem('is_invite', 'true') } catch(e){}
        console.log('招待フラグを保存しました')
      }
      
      // 招待からのログインかどうかでリダイレクト先を変更
      const redirectTo = isInvite
        ? `${process.env.NEXT_PUBLIC_URL || window.location.origin}/auth/accept-invite/callback`
        : `${process.env.NEXT_PUBLIC_URL || window.location.origin}/auth/callback`;
      
      // セッションの有効期限を延長するためのカスタムオプション
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            // 有効期限を24時間に設定
            expires_in: (24 * 60 * 60).toString()
          }
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
    <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-4' : 'p-6'} w-full max-w-md mx-auto`}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-center text-primary-600 mb-6`}>
        Kaizenにログイン
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full flex justify-center items-center ${isMobile ? 'py-2.5' : 'py-2'} px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors`}
        >
          <svg className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
            />
          </svg>
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              ログイン中...
            </span>
          ) : 'Googleでログイン'}
        </button>
        
        <div className={`text-center ${isMobile ? 'text-xs' : 'text-sm'} text-secondary-600`}>
          <p className="mt-2">
            ログインすることで、
            <Link href="/terms" className="text-primary-600 hover:text-primary-800">
              利用規約
            </Link>
            と
            <Link href="/privacy" className="text-primary-600 hover:text-primary-800">
              プライバシーポリシー
            </Link>
            に同意したことになります。
          </p>
        </div>
      </div>
    </div>
  )
}
