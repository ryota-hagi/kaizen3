'use client'

import React, { useState } from 'react'
import { UserInfo, Employee } from '@/utils/api'

interface UserDetailModalProps {
  isOpen: boolean
  user: UserInfo
  isEditMode: boolean
  editedUser: Partial<UserInfo>
  employees: Employee[]
  onClose: () => void
  onToggleEditMode: () => void
  onEditChange: (field: string, value: string) => void
  onUpdate: () => Promise<void>
  generateInviteLink: (user: UserInfo) => string
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  user,
  isEditMode,
  editedUser,
  employees,
  onClose,
  onToggleEditMode,
  onEditChange,
  onUpdate,
  generateInviteLink
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  
  if (!isOpen || !user) return null
  
  // 招待リンクを生成
  const inviteLink = generateInviteLink(user);
  
  // クリップボードにコピーする関数
  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-secondary-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-secondary-900">
            {isEditMode ? 'ユーザー編集' : 'ユーザー詳細'}
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
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl">
              {user.fullName.charAt(0) || user.email.charAt(0)}
            </div>
            <div className="ml-4">
              <h4 className="text-xl font-medium text-secondary-900">{user.fullName || user.email}</h4>
              <p className="text-secondary-500">{user.email}</p>
              {user.status === '招待中' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  招待中
                </span>
              )}
            </div>
          </div>
          
          {/* 招待リンク表示（招待中のユーザーのみ） */}
          {user.isInvited && inviteLink && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">招待リンク</h3>
              <div className="flex items-center">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 p-2 text-sm bg-white border border-blue-300 rounded-md"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {copySuccess ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                このリンクを招待したいユーザーに共有してください。リンクは7日間有効です。
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-secondary-500">ユーザー名</p>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedUser.username}
                  onChange={(e) => onEditChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="font-medium">{user.username}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm text-secondary-500">役割</p>
              {isEditMode ? (
                <select
                  value={editedUser.role}
                  onChange={(e) => onEditChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="管理者">管理者</option>
                  <option value="マネージャー">マネージャー</option>
                  <option value="一般ユーザー">一般ユーザー</option>
                </select>
              ) : (
                <p className="font-medium">{user.role}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-secondary-500">部署</p>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedUser.department}
                  onChange={(e) => onEditChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="font-medium">{user.department || '-'}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-secondary-500">役職</p>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedUser.position}
                  onChange={(e) => onEditChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="font-medium">{user.position || '-'}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-secondary-500">登録日</p>
              <p className="font-medium">{new Date(user.createdAt).toLocaleDateString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-500">最終ログイン</p>
              <p className="font-medium">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ja-JP') : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary-500">ステータス</p>
              <p className="font-medium">
                {user.status || 'アクティブ'}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary-500">会社ID</p>
              <p className="font-medium">{user.companyId || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-500">ユーザーID</p>
              <p className="font-medium">{user.id}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-secondary-500">紐づけ従業員</p>
              {isEditMode ? (
                <select
                  value={editedUser.employeeId || ''}
                  onChange={(e) => onEditChange('employeeId', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">選択してください</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.department} - {employee.position})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">
                  {user.employeeId 
                    ? employees.find(e => e.id === user.employeeId)?.name + 
                      ' (' + employees.find(e => e.id === user.employeeId)?.department + ' - ' + 
                      employees.find(e => e.id === user.employeeId)?.position + ')'
                    : '紐づけなし'}
                </p>
              )}
            </div>
          </div>
          
          <div className="border-t border-secondary-200 pt-4 flex justify-end space-x-4">
            {isEditMode ? (
              <>
                <button
                  onClick={() => onToggleEditMode()}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={onUpdate}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  保存
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                >
                  閉じる
                </button>
                <button
                  onClick={onToggleEditMode}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  編集
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
