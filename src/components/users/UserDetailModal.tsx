'use client'

import React from 'react'
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
  if (!isOpen || !user) return null

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
              {user.fullName.charAt(0)}
            </div>
            <div className="ml-4">
              <h4 className="text-xl font-medium text-secondary-900">{user.fullName}</h4>
              <p className="text-secondary-500">{user.email}</p>
            </div>
          </div>
          
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
            
            {/* 招待中のユーザーの場合は招待リンクを表示 */}
            {(user.status === '招待中' || user.isInvited) && user.inviteToken && (
              <div className="col-span-2 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800 mb-2">招待リンク</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={generateInviteLink(user)}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border border-secondary-300 rounded-l-md focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const link = generateInviteLink(user);
                      navigator.clipboard.writeText(link)
                        .then(() => {
                          alert('招待リンクをクリップボードにコピーしました');
                        })
                        .catch(err => {
                          console.error('クリップボードへのコピーに失敗しました:', err);
                        });
                    }}
                    className="px-3 py-2 bg-primary-600 text-white text-xs rounded-r-md hover:bg-primary-700 transition-colors"
                  >
                    コピー
                  </button>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  このリンクを招待したユーザーに共有してください。リンクをクリックするとアカウントを有効化できます。
                </p>
              </div>
            )}
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
                {user.status || (user.isInvited ? '招待中' : 'アクティブ')}
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
            {user.inviteToken && (
              <div>
                <p className="text-sm text-secondary-500">招待トークン</p>
                <p className="font-medium text-xs break-all">{user.inviteToken}</p>
              </div>
            )}
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
