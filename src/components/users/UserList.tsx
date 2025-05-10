'use client'

import React, { useState, useEffect } from 'react'
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
  // 画面サイズの変更を検知
  const [isMobile, setIsMobile] = useState(false)
  
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
  
  // ユーザーの検索とフィルタリング
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === '' || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  // 役割に応じたバッジスタイルを取得する関数
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case '管理者':
        return 'bg-red-100 text-red-800'
      case 'マネージャー':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }
  
  // ステータスに応じたバッジスタイルを取得する関数
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ログアウト中':
        return 'bg-gray-100 text-gray-800'
      case '招待中':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
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
      
      {/* 表示切り替えボタン */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${!isMobile ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'}`}
            onClick={() => setIsMobile(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            テーブル表示
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${isMobile ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'}`}
            onClick={() => setIsMobile(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            カード表示
          </button>
        </div>
      </div>
      
      {/* モバイル表示（カード形式） */}
      {isMobile ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-white border border-secondary-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0 h-12 w-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-lg">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-secondary-900">{user.fullName}</h3>
                    <p className="text-sm text-secondary-500">{user.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-secondary-500">役割</p>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeStyle(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-500">部署</p>
                    <p className="text-sm font-medium">{user.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-500">登録日</p>
                    <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-500">最終ログイン</p>
                    <p className="text-sm font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ja-JP') : '-'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(user.status || 'アクティブ')}`}>
                    {user.status || 'アクティブ'}
                  </span>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onOpenUserDetail(user.id)}
                      className="px-3 py-1 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
                    >
                      詳細
                    </button>
                    {user.status === '招待中' ? (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md">招待中</span>
                    ) : (
                      <button
                        onClick={() => user.id !== currentUserId && onOpenDeleteConfirm(user.id)}
                        className={`px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors ${user.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={user.id === currentUserId}
                      >
                        {user.id === currentUserId ? '削除不可' : '削除'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-secondary-50 rounded-lg">
              <p className="text-secondary-500">該当するユーザーが見つかりません</p>
            </div>
          )}
        </div>
      ) : (
        /* デスクトップ表示（テーブル形式） */
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeStyle(user.role)}`}>
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(user.status || 'アクティブ')}`}>
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
                      {user.status === '招待中' ? (
                        <span className="text-yellow-600">招待中</span>
                      ) : (
                        <button
                          onClick={() => user.id !== currentUserId && onOpenDeleteConfirm(user.id)}
                          className={`text-red-600 hover:text-red-900 ${user.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={user.id === currentUserId}
                        >
                          {user.id === currentUserId ? '削除不可' : '削除'}
                        </button>
                      )}
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
      )}
    </div>
  )
}
