'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import { UserInfo } from '@/utils/api'
import { UserRoleAlert } from './UserRoleAlert'
import { UserList } from '@/components/users/UserList'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { DeleteConfirmModal } from '@/components/users/DeleteConfirmModal'
import { SuccessMessage } from '@/components/users/SuccessMessage'
import { UserInviteModal } from '@/components/users/UserInviteModal'

export default function UsersPage() {
  const { isAuthenticated, currentUser, users, getUserById, deleteUser, updateUser, getEmployees } = useUser()
  const router = useRouter()
  
  // 状態管理
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserInfo | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedUser, setEditedUser] = useState<Partial<UserInfo>>({})
  const [employees, setEmployees] = useState(getEmployees())
  
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
  
  // ユーザーリストを取得（会社IDが同一のもののみ）
  
  // ユーザー詳細モーダルを開く
  const openUserModal = (userId: string) => {
    const user = getUserById(userId)
    if (user) {
      // 最新の従業員情報を取得
      setEmployees(getEmployees())
      
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
  
  // ダミーの関数（互換性のため）
  const generateInviteLink = (user: UserInfo) => {
    return '';
  }
  
  // 同じ会社のユーザーのみ表示
  const filteredUsers = users.filter(user => 
    currentUser && user.companyId === currentUser.companyId
  );
  
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
          <div className="flex space-x-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              ユーザーを招待
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
        
        {/* ユーザーリスト */}
        <UserList 
          users={filteredUsers}
          currentUserId={currentUser.id}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          onOpenUserDetail={openUserModal}
          onOpenDeleteConfirm={openDeleteModal}
        />
      </div>
      
      {/* 成功メッセージ */}
      <SuccessMessage 
        show={deleteSuccess} 
        message="ユーザーが正常に削除されました" 
      />
      
      {/* 更新成功メッセージ */}
      <SuccessMessage 
        show={updateSuccess} 
        message="ユーザー情報が正常に更新されました" 
      />
      
      {/* 招待成功メッセージ */}
      <SuccessMessage 
        show={inviteSuccess} 
        message="ユーザーを招待しました" 
      />
      
      {/* ユーザー詳細モーダル */}
      {selectedUser && (
        <UserDetailModal
          isOpen={isModalOpen}
          user={selectedUser}
          isEditMode={isEditMode}
          editedUser={editedUser}
          employees={employees}
          onClose={closeUserModal}
          onToggleEditMode={toggleEditMode}
          onEditChange={handleEditChange}
          onUpdate={handleUpdateUser}
          generateInviteLink={generateInviteLink}
        />
      )}
      
      {/* 削除確認モーダル */}
      {userToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          user={userToDelete}
          onClose={closeDeleteModal}
          onDelete={handleDeleteUser}
        />
      )}
      
      {/* 招待モーダル */}
      <UserInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={(message) => {
          setInviteSuccess(true);
          setTimeout(() => {
            setInviteSuccess(false);
          }, 3000);
        }}
      />
    </DashboardLayout>
  )
}
