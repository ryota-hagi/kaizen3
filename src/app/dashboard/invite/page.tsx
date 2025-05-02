'use client'

import React, { useState } from 'react'
import { useUser } from '@/contexts/UserContext/context'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import Link from 'next/link'

export default function InvitePage() {
  const { currentUser, inviteUser } = useUser()
  
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('一般ユーザー')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('► handleSubmit called')
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    setInviteLink(null)
    
    if (!email) {
      setError('メールアドレスを入力してください')
      setIsSubmitting(false)
      return
    }
    
    try {
      // 会社IDを取得（現在のユーザーから）
      const companyId = currentUser?.companyId
      
      if (!companyId) {
        setError('会社情報が見つかりません。管理者に連絡してください。')
        setIsSubmitting(false)
        return
      }
      
      console.log('[DEBUG] Inviting user with company ID:', companyId)
      
      // 直接fetchを呼び出してテスト（絶対パスで）
      try {
        const pingUrl = window.location.origin + '/api/ping';
        console.log('[DEBUG] Testing direct fetch to ping:', pingUrl)
        const pingResponse = await fetch(pingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        })
        const pingResult = await pingResponse.json()
        console.log('[DEBUG] Direct ping result:', pingResult)
      } catch (pingError) {
        console.error('[DEBUG] Direct ping error:', pingError)
      }
      
      // UserContextのinviteUser関数を使用
      console.log('[DEBUG] Before calling inviteUser')
      const result = await inviteUser({
        email,
        role,
        companyId
      })
      console.log('[DEBUG] After calling inviteUser, result:', result)
      
      if (result.success) {
        setSuccess(`${email}に招待メールを送信しました`)
        
        // 招待トークンを保存
        const token = result.inviteToken || null
        setInviteToken(token)
        
        // 招待リンクを生成
        if (token) {
          const inviteLink = `${window.location.origin}/auth/invited-login?token=${encodeURIComponent(token)}`
          setInviteLink(inviteLink)
        }
        
        setEmail('')
        setRole('一般ユーザー')
      } else {
        setError(result.message || '招待に失敗しました')
      }
    } catch (err) {
      console.error('Error inviting user:', err)
      setError('招待処理中にエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">ユーザーを招待</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="招待するユーザーのメールアドレス"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-secondary-700 mb-1">
                役割
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                <option value="一般ユーザー">一般ユーザー</option>
                <option value="管理者">管理者</option>
              </select>
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? '処理中...' : '招待を送信'}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
              {success}
            </div>
          )}
          
          {inviteLink && (
            <div className="mt-6 p-4 border border-secondary-200 rounded-md bg-secondary-50">
              <h3 className="text-lg font-medium text-secondary-900 mb-2">招待リンク</h3>
              <p className="text-sm text-secondary-600 mb-3">
                以下のリンクを招待したユーザーに共有してください：
              </p>
              <div className="p-3 bg-white border border-secondary-200 rounded-md break-all text-sm">
                <a href={inviteLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  {inviteLink}
                </a>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink || '');
                    alert('招待リンクをクリップボードにコピーしました');
                  }}
                  className="px-3 py-1 bg-secondary-200 text-secondary-700 rounded-md hover:bg-secondary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-colors text-sm"
                >
                  リンクをコピー
                </button>
              </div>
            </div>
          )}
          
          {/* デバッグ情報（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && inviteToken && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <p>デバッグ情報:</p>
              <p>会社ID: {currentUser?.companyId || 'なし'}</p>
              <p>招待トークン: {inviteToken}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Link
            href="/dashboard/users"
            className="text-primary-600 hover:text-primary-700 hover:underline"
          >
            ユーザー管理に戻る →
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
