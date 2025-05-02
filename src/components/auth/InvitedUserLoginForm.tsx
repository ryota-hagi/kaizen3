'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface InvitedUserLoginFormProps {
  onSuccess?: () => void
  inviteToken?: string
  companyId?: string
  isInvite?: boolean
}

export const InvitedUserLoginForm: React.FC<InvitedUserLoginFormProps> = ({ 
  onSuccess,
  inviteToken: propInviteToken,
  companyId: propCompanyId,
  isInvite: propIsInvite
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  
  // URLパラメータまたはpropsからトークンと会社IDを取得
  useEffect(() => {
    const urlToken = searchParams?.get('token')
    const urlCompanyId = searchParams?.get('companyId')
    
    console.log('[DEBUG] URL token:', urlToken)
    console.log('[DEBUG] Prop token:', propInviteToken)
    console.log('[DEBUG] URL companyId:', urlCompanyId)
    console.log('[DEBUG] Prop companyId:', propCompanyId)
    
    // トークンの設定
    if (urlToken) {
      console.log('[DEBUG] Using URL token')
      setToken(urlToken)
      // トークンをセッションストレージとローカルストレージに保存（コールバック後に使用するため）
      sessionStorage.setItem('invite_token', urlToken)
      localStorage.setItem('invite_token', urlToken)
    } else if (propInviteToken) {
      console.log('[DEBUG] Using prop token')
      setToken(propInviteToken)
      // トークンをセッションストレージとローカルストレージに保存（コールバック後に使用するため）
      sessionStorage.setItem('invite_token', propInviteToken)
      localStorage.setItem('invite_token', propInviteToken)
    } else {
      // セッションストレージまたはローカルストレージからトークンを取得（既に保存されている場合）
      const storedToken = sessionStorage.getItem('invite_token') || localStorage.getItem('invite_token')
      if (storedToken) {
        console.log('[DEBUG] Using stored token:', storedToken)
        setToken(storedToken)
      }
    }
    
    // 会社IDの設定
    if (urlCompanyId) {
      console.log('[DEBUG] Using URL companyId')
      setCompanyId(urlCompanyId)
      // 会社IDをセッションストレージとローカルストレージに保存
      sessionStorage.setItem('invite_company_id', urlCompanyId)
      localStorage.setItem('invite_company_id', urlCompanyId)
    } else if (propCompanyId) {
      console.log('[DEBUG] Using prop companyId')
      setCompanyId(propCompanyId)
      // 会社IDをセッションストレージとローカルストレージに保存
      sessionStorage.setItem('invite_company_id', propCompanyId)
      localStorage.setItem('invite_company_id', propCompanyId)
    } else {
      // セッションストレージまたはローカルストレージから会社IDを取得
      const storedCompanyId = sessionStorage.getItem('invite_company_id') || localStorage.getItem('invite_company_id')
      if (storedCompanyId) {
        console.log('[DEBUG] Using stored companyId:', storedCompanyId)
        setCompanyId(storedCompanyId)
      }
    }
    
    // 現在の状態をログに出力
    console.log('[DEBUG] Current token state:', token)
    console.log('[DEBUG] Current companyId state:', companyId)
    console.log('[DEBUG] Session storage token:', sessionStorage.getItem('invite_token'))
    console.log('[DEBUG] Local storage token:', localStorage.getItem('invite_token'))
    console.log('[DEBUG] Session storage companyId:', sessionStorage.getItem('invite_company_id'))
    console.log('[DEBUG] Local storage companyId:', localStorage.getItem('invite_company_id'))
  }, [searchParams, propInviteToken, propCompanyId])
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentToken = token || sessionStorage.getItem('invite_token') || localStorage.getItem('invite_token')
      
      if (!currentToken) {
        setError('招待トークンが見つかりません。招待メールのリンクから再度アクセスしてください。')
        setLoading(false)
        // 無効な招待ページにリダイレクト
        router.replace('/auth/invite/invalid')
        return
      }
      
      console.log('[DEBUG] Login with token:', currentToken)
      
      const supabase = getSupabaseClient()
      
      // 招待トークンをセッションストレージとローカルストレージに保存（コールバック後に使用するため）
      sessionStorage.setItem('invite_token', currentToken)
      localStorage.setItem('invite_token', currentToken)
      
      // 現在の会社IDを取得
      const currentCompanyId = companyId || 
        sessionStorage.getItem('invite_company_id') || 
        localStorage.getItem('invite_company_id');
      
      // URLパラメータにトークンと会社IDを含める
      let redirectUrl = `${window.location.origin}/auth/callback?invite=true&token=${encodeURIComponent(currentToken)}`;
      
      // 会社IDがある場合は追加
      if (currentCompanyId) {
        redirectUrl += `&companyId=${encodeURIComponent(currentCompanyId)}`;
        
        // 会社IDをセッションストレージとローカルストレージに保存
        sessionStorage.setItem('invite_company_id', currentCompanyId);
        localStorage.setItem('invite_company_id', currentCompanyId);
        
        console.log('[DEBUG] Added companyId to redirect URL:', currentCompanyId);
      }
      
      const redirectTo = redirectUrl;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
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
    <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-secondary-900 mb-2">招待ユーザーログイン</h2>
      <p className="text-secondary-600 mb-6">招待されたユーザーはこちらからアカウントを有効化してください</p>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        <p className="text-secondary-600 mb-4">
          Googleアカウントを使用してログインしてください。メールアドレス、氏名などの情報はGoogleアカウントから取得します。
        </p>
        
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
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-secondary-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-secondary-500">
              または
            </span>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/auth/login"
            className="w-full flex justify-center py-2 px-4 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            通常のログインへ
          </a>
        </div>
      </div>
      
      {/* デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 bg-gray-100 rounded text-xs">
          <p>デバッグ情報:</p>
          <p>URL Token: {searchParams?.get('token') || 'なし'}</p>
          <p>Prop Token: {propInviteToken || 'なし'}</p>
          <p>Current Token: {token || 'なし'}</p>
          <p>URL CompanyId: {searchParams?.get('companyId') || 'なし'}</p>
          <p>Prop CompanyId: {propCompanyId || 'なし'}</p>
          <p>Current CompanyId: {companyId || 'なし'}</p>
          <p>Session Storage Token: {typeof window !== 'undefined' ? sessionStorage.getItem('invite_token') || 'なし' : 'なし'}</p>
          <p>Local Storage Token: {typeof window !== 'undefined' ? localStorage.getItem('invite_token') || 'なし' : 'なし'}</p>
          <p>Session Storage CompanyId: {typeof window !== 'undefined' ? sessionStorage.getItem('invite_company_id') || 'なし' : 'なし'}</p>
          <p>Local Storage CompanyId: {typeof window !== 'undefined' ? localStorage.getItem('invite_company_id') || 'なし' : 'なし'}</p>
          <p>Is Invite: {propIsInvite ? 'true' : 'false'}</p>
        </div>
      )}
    </div>
  )
}
