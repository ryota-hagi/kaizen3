'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'

interface CompanyMenuProps {
  companyName: string
  isAdmin: boolean
}

export const CompanyMenu: React.FC<CompanyMenuProps> = ({ companyName, isAdmin }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { deleteCompanyAccount } = useUser()
  const router = useRouter()

  // メニューの開閉
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    // メニューを閉じる時は確認ダイアログも閉じる
    if (isMenuOpen) {
      setIsConfirmOpen(false)
    }
  }

  // 削除確認ダイアログの開閉
  const toggleConfirm = () => {
    setIsConfirmOpen(!isConfirmOpen)
    setError(null)
  }

  // 会社アカウント削除処理
  const handleDeleteCompany = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteCompanyAccount()
      
      if (result.success) {
        // 削除成功時はログインページにリダイレクト
        router.push('/auth/login')
      } else {
        // エラーメッセージを表示
        setError(result.message || '会社アカウントの削除に失敗しました')
        setIsDeleting(false)
      }
    } catch (err) {
      console.error('会社アカウント削除エラー:', err)
      setError('会社アカウントの削除中にエラーが発生しました')
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative">
      {/* 会社名をクリックするとメニューが開く */}
      <button
        onClick={toggleMenu}
        className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-secondary-700 hover:bg-secondary-50 w-full"
      >
        <span>{companyName}</span>
        <svg
          className={`ml-1 h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* サブメニュー */}
      {isMenuOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            {/* 管理者のみ表示 */}
            {isAdmin && (
              <button
                onClick={toggleConfirm}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-secondary-50"
              >
                会社アカウント削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold text-red-600 mb-4">
              会社アカウント削除の確認
            </h3>
            <p className="mb-4 text-secondary-700">
              会社アカウントを削除すると、すべてのユーザーデータと会社情報が完全に削除されます。
              この操作は元に戻せません。本当に削除しますか？
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={toggleConfirm}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteCompany}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
