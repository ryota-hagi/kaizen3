'use client'

import React from 'react'
import { UserInfo } from '@/utils/api'

interface DeleteConfirmModalProps {
  isOpen: boolean
  user: UserInfo
  onClose: () => void
  onDelete: () => Promise<void>
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  user,
  onClose,
  onDelete
}) => {
  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-secondary-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-secondary-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-secondary-900">
            ユーザーの削除
          </h3>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-secondary-700">
              本当に <span className="font-bold">{user.fullName}</span> を削除しますか？
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              この操作は元に戻すことができません。
            </p>
          </div>
          
          <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  警告
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>
                    ユーザーを削除すると、そのユーザーに関連するすべてのデータが削除されます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-secondary-50 flex justify-end space-x-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}
