'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

interface InvitedUserLoginFormProps {
  onSuccess?: () => void
  inviteToken?: string
}

export const InvitedUserLoginForm: React.FC<InvitedUserLoginFormProps> = ({ 
  onSuccess,
  inviteToken
}) => {
  const router = useRouter()
  const { verifyInviteToken, completeInvitation } = useUser()
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteToken) {
      setError('招待トークンが見つかりません')
      return
    }
    
    if (!fullName) {
      setError('氏名を入力してください')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // トークンの検証
      const { valid, user } = await verifyInviteToken(inviteToken)
      
      if (!valid) {
        setError('無効な招待トークンです')
        setLoading(false)
        return
      }
      
      // 招待の完了
      const success = await completeInvitation(inviteToken, {
        fullName,
        companyId: user?.companyId
      })
      
      if (success) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/dashboard')
        }
      } else {
        setError('アカウントの有効化に失敗しました')
      }
    } catch (err) {
      console.error('Error completing invitation:', err)
      setError('アカウントの有効化中にエラーが発生しました')
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
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700">
            氏名
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="例: 山田太郎"
            required
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {loading ? 'アカウント有効化中...' : 'アカウントを有効化'}
          </button>
        </div>
      </form>
      
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
    </div>
  )
}
