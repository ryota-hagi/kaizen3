'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useUser } from '@/contexts/UserContext/context'
import Link from 'next/link'
import { UserInviteForm } from '@/components/auth/UserInviteForm'
import { UserInviteSuccess } from '@/components/auth/UserInviteSuccess'

export default function AddUserPage() {
  const router = useRouter()
  const { currentUser, inviteUser } = useUser()
  
  // エラーと成功メッセージの状態
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // フォーム送信ハンドラ
  const handleSubmit = async (email: string, role: string) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)
    setInviteLink(null)
    
    // バリデーション
    if (!email) {
      setError('メールアドレスを入力してください')
      setIsSubmitting(false)
      return
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレスを入力してください')
      setIsSubmitting(false)
      return
    }
    
    try {
      // 会社情報を取得
      if (!currentUser || !currentUser.companyId) {
        setError('会社情報が見つかりません。再度ログインしてください。')
        setIsSubmitting(false)
        return
      }
      
      const companyId = currentUser.companyId
      console.log('[DEBUG] Using company ID for invitation:', companyId)
      
      // ユーザー招待
      const result = await inviteUser({
        email: email,
        role: role,
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
  
  // フォームリセット
  const resetForm = () => {
    setSuccess(false)
    setInviteLink(null)
    setError(null)
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
            <UserInviteSuccess 
              inviteLink={inviteLink}
              onReset={resetForm}
              copyInviteLink={copyInviteLink}
            />
          ) : (
            <UserInviteForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={error}
            />
          )}
        </div>
        
        {/* デバッグ情報（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && currentUser && (
          <div className="mt-6 p-3 bg-gray-100 rounded text-xs">
            <p>デバッグ情報:</p>
            <p>現在のユーザー: {currentUser.email}</p>
            <p>会社ID: {currentUser.companyId || 'なし'}</p>
            <p>ロール: {currentUser.role}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
