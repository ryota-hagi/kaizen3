'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import { UserInfo, Employee } from '@/utils/api'
import { UserRoleAlert } from './UserRoleAlert'

export default function UsersPage() {
  const { isAuthenticated, currentUser, users, getUserById, deleteUser, updateUser, getEmployees } = useUser()
  const router = useRouter()
  
  // 状態管理
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserInfo | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedUser, setEditedUser] = useState<Partial<UserInfo>>({})
  const [employees, setEmployees] = useState<Employee[]>([])
  
  // 従業員一覧を取得
  const fetchEmployees = () => {
    setEmployees(getEmployees())
  }
  
  // 初回レンダリング時に従業員一覧を取得
  useEffect(() => {
    fetchEmployees()
  }, [])
  
  // 認証状態をチェック
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    } else if (currentUser && currentUser.role !== '管理者') {
      // 管理者以外はダッシュボードにリダイレクト
      router.push('/dashboard')
    }
  }, [isAuthenticated, currentUser, router])
  
  // 認証されていない場合はローディング表示
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  // ユーザーの検索とフィルタリング
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === '' || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })
  
  // ユーザー詳細モーダルを開く
  const openUserModal = (userId: string) => {
    const user = getUserById(userId)
    if (user) {
      // 最新の従業員情報を取得
      fetchEmployees()
      
      setSelectedUser(user)
      setEditedUser({
        username: user.username,
        role: user.role,
        department: user.department || '',
        position: user.position || '',
        employeeId: user.employeeId || ''
      })
      setIsEditMode(false)
      setIsModalOpen(true)
    }
  }
  
  // ユーザー詳細モーダルを閉じる
  const closeUserModal = () => {
    setSelectedUser(null)
    setEditedUser({})
    setIsEditMode(false)
    setIsModalOpen(false)
  }
  
  // 削除確認モーダルを開く
  const openDeleteModal = (userId: string) => {
    const user = getUserById(userId)
    if (user) {
      setUserToDelete(user)
      setIsDeleteModalOpen(true)
    }
  }
  
  // 削除確認モーダルを閉じる
  const closeDeleteModal = () => {
    setUserToDelete(null)
    setIsDeleteModalOpen(false)
  }
  
  // ユーザー削除処理
  const handleDeleteUser = async () => {
    if (userToDelete) {
      const result = await deleteUser(userToDelete.id)
      if (result.success) {
        setDeleteSuccess(true)
        closeDeleteModal()
        
        // 3秒後に成功メッセージを非表示
        setTimeout(() => {
          setDeleteSuccess(false)
        }, 3000)
      } else if (result.message) {
        // エラーメッセージがある場合はアラートで表示
        alert(result.message)
        closeDeleteModal()
      }
    }
  }
  
  // ユーザー編集処理
  const handleUpdateUser = async () => {
    if (selectedUser && Object.keys(editedUser).length > 0) {
      console.log('更新するユーザー情報:', selectedUser.id, editedUser);
      const success = await updateUser(selectedUser.id, editedUser)
      console.log('更新結果:', success);
      
      if (success) {
        setUpdateSuccess(true)
        setIsEditMode(false)
        
        // 更新されたユーザー情報を取得
        const updatedUser = getUserById(selectedUser.id)
        console.log('更新後のユーザー情報:', updatedUser);
        
        if (updatedUser) {
          setSelectedUser(updatedUser)
          
          // ローカルストレージに直接保存して確実に反映させる
          const usersWithPasswords = JSON.parse(localStorage.getItem('kaizen_users') || '[]');
          const updatedUsersWithPasswords = usersWithPasswords.map((item: any) => {
            if (item.user.id === selectedUser.id) {
              return {
                ...item,
                user: {
                  ...item.user,
                  ...editedUser
                }
              };
            }
            return item;
          });
          
          localStorage.setItem('kaizen_users', JSON.stringify(updatedUsersWithPasswords));
          console.log('ローカルストレージに保存しました');
        }
        
        // 3秒後に成功メッセージを非表示
        setTimeout(() => {
          setUpdateSuccess(false)
        }, 3000)
      }
    }
  }
  
  // 編集モードの切り替え
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
  }
  
  // 編集フィールドの変更ハンドラ
  const handleEditChange = (field: string, value: string) => {
    setEditedUser({
      ...editedUser,
      [field]: value
    })
  }
  
  return (
    <DashboardLayout>
      {/* 管理者アラート */}
      <UserRoleAlert />
      
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">ユーザー管理</h1>
            <p className="text-secondary-600">
              システムユーザーの管理と権限設定を行います
            </p>
          </div>
          <div className="flex space-x-4">
          <Link
            href="/dashboard/users/add"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            ユーザーを追加
          </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="ユーザー名、メールアドレス、氏名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                onChange={(e) => setSelectedRole(e.target.value)}
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
                          ${user.status === '招待中' ? 'bg-yellow-100 text-yellow-800' : 
                            user.status === 'ログアウト中' ? 'bg-gray-100 text-gray-800' : 
                            'bg-green-100 text-green-800'}`}>
                          {user.status || (user.isInvited ? '招待中' : 'アクティブ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openUserModal(user.id)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          詳細
                        </button>
                        <button
                          onClick={() => user.id !== currentUser.id && openDeleteModal(user.id)}
                          className={`text-red-600 hover:text-red-900 ${user.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={user.id === currentUser.id}
                        >
                          {user.id === currentUser.id ? '削除不可' : '削除'}
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
      </div>
      
      {/* 成功メッセージ */}
      {deleteSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>ユーザーが正常に削除されました</span>
          </div>
        </div>
      )}
      
      {/* 更新成功メッセージ */}
      {updateSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>ユーザー情報が正常に更新されました</span>
          </div>
        </div>
      )}
      
      {/* ユーザー詳細モーダル */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-secondary-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-secondary-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-secondary-900">
                {isEditMode ? 'ユーザー編集' : 'ユーザー詳細'}
              </h3>
              <button
                onClick={closeUserModal}
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
                  {selectedUser.fullName.charAt(0)}
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-medium text-secondary-900">{selectedUser.fullName}</h4>
                  <p className="text-secondary-500">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-secondary-500">ユーザー名</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedUser.username}
                      onChange={(e) => handleEditChange('username', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-medium">{selectedUser.username}</p>
                  )}
                </div>
                
                {/* 招待中のユーザーの場合は招待リンクを表示 */}
                {(selectedUser.status === '招待中' || selectedUser.isInvited) && selectedUser.inviteToken && (
                  <div className="col-span-2 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-800 mb-2">招待リンク</p>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={`${window.location.origin}/auth/invited-login?token=${selectedUser.inviteToken}`}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs border border-secondary-300 rounded-l-md focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/auth/invited-login?token=${selectedUser.inviteToken}`;
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
                      onChange={(e) => handleEditChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="管理者">管理者</option>
                      <option value="マネージャー">マネージャー</option>
                      <option value="一般ユーザー">一般ユーザー</option>
                    </select>
                  ) : (
                    <p className="font-medium">{selectedUser.role}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-secondary-500">部署</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedUser.department}
                      onChange={(e) => handleEditChange('department', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-medium">{selectedUser.department || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-secondary-500">役職</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedUser.position}
                      onChange={(e) => handleEditChange('position', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-medium">{selectedUser.position || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-secondary-500">登録日</p>
                  <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('ja-JP')}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">最終ログイン</p>
                  <p className="font-medium">
                    {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString('ja-JP') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">ステータス</p>
                  <p className="font-medium">
                    {selectedUser.status || (selectedUser.isInvited ? '招待中' : 'アクティブ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">会社ID</p>
                  <p className="font-medium">{selectedUser.companyId}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">ユーザーID</p>
                  <p className="font-medium">{selectedUser.id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-secondary-500">紐づけ従業員</p>
                  {isEditMode ? (
                    <select
                      value={editedUser.employeeId || ''}
                      onChange={(e) => handleEditChange('employeeId', e.target.value)}
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
                      {selectedUser.employeeId 
                        ? employees.find(e => e.id === selectedUser.employeeId)?.name + 
                          ' (' + employees.find(e => e.id === selectedUser.employeeId)?.department + ' - ' + 
                          employees.find(e => e.id === selectedUser.employeeId)?.position + ')'
                        : '紐づけなし'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="border-t border-secondary-200 pt-4 flex justify-end space-x-4">
                {isEditMode ? (
                  <>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleUpdateUser}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                      保存
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closeUserModal}
                      className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={toggleEditMode}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                      編集
                    </button>
                    {selectedUser.id !== currentUser.id && (
                      <button
                        onClick={() => {
                          closeUserModal()
                          openDeleteModal(selectedUser.id)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 削除確認モーダル */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-secondary-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h3 className="text-lg font-medium text-secondary-900">ユーザー削除の確認</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-secondary-700 mb-4">
                以下のユーザーを削除してもよろしいですか？この操作は元に戻せません。
              </p>
              
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                  {userToDelete.fullName.charAt(0)}
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-secondary-900">{userToDelete.fullName}</div>
                  <div className="text-sm text-secondary-500">{userToDelete.email}</div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
