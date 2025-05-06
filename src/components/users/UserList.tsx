'use client'

import React from 'react'
import { UserInfo } from '@/utils/api'

interface UserListProps {
  users: UserInfo[]
  currentUserId: string
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedRole: string
  onRoleChange: (value: string) => void
  onOpenUserDetail: (userId: string) => void
  onOpenDeleteConfirm: (userId: string) => void
}

export const UserList: React.FC<UserListProps> = ({
  users,
  currentUserId,
  searchTerm,
  onSearchChange,
  selectedRole,
  onRoleChange,
  onOpenUserDetail,
  onOpenDeleteConfirm
}) => {
  // ユーザーの検索とフィルタリング
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === '' || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ユーザー名、メールアドレス、氏名で検索..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="w-full md:w-64">
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">すべての役割</option>
            <option value="管理者">管理者</option>
            <option value="マネージャー">マネージャー</option>
            <option value="一般ユーザー">一般ユーザー</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                役割
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                部署
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                登録日
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                最終ログイン
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                ステータス
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-secondary-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                        {user.fullName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-secondary-900">{user.fullName}</div>
                        <div className="text-sm text-secondary-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === '管理者' ? 'bg-red-100 text-red-800' : 
                        user.role === 'マネージャー' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ja-JP') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.status === 'ログアウト中' ? 'bg-gray-100 text-gray-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {user.status || 'アクティブ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onOpenUserDetail(user.id)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      詳細
                    </button>
                    <button
                      onClick={() => user.id !== currentUserId && onOpenDeleteConfirm(user.id)}
                      className={`text-red-600 hover:text-red-900 ${user.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={user.id === currentUserId}
                    >
                      {user.id === currentUserId ? '削除不可' : '削除'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-secondary-500">
                  該当するユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
