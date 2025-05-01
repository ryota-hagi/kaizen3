'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext/context'

export const UserRoleAlert = () => {
  const { users, updateUser, currentUser } = useUser()
  const [showAlert, setShowAlert] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [nonAdminUsers, setNonAdminUsers] = useState<Array<{id: string, fullName: string, role: string}>>([])

  // 管理者が存在するかチェック
  useEffect(() => {
    if (!currentUser || !currentUser.companyId) return;
    
    // 現在の会社に所属するユーザーのみをフィルタリング
    const companyUsers = users.filter(user => user.companyId === currentUser.companyId);
    
    // 管理者の数をカウント
    const adminUsers = companyUsers.filter(user => user.role === '管理者');
    
    if (adminUsers.length === 0 && companyUsers.length > 0) {
      // 管理者が存在しない場合、アラートを表示
      
      // 優先順位に基づいてユーザーをソート
      // 1. マネージャー
      // 2. 一般ユーザー
      const managers = companyUsers
        .filter(user => user.role === 'マネージャー')
        .map(user => ({
          id: user.id,
          fullName: user.fullName,
          role: user.role
        }));
      
      const regularUsers = companyUsers
        .filter(user => user.role !== '管理者' && user.role !== 'マネージャー')
        .map(user => ({
          id: user.id,
          fullName: user.fullName,
          role: user.role
        }));
      
      // マネージャーを先頭に、次に一般ユーザーを配置
      const sortedUsers = [...managers, ...regularUsers];
      
      setNonAdminUsers(sortedUsers);
      
      // 自動的に最初のユーザーを選択
      if (sortedUsers.length > 0) {
        setSelectedUserId(sortedUsers[0].id);
      }
      
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }
  }, [users, currentUser]);

  // 管理者に設定する
  const handleSetAdmin = async () => {
    if (!selectedUserId) return;

    try {
      const result = await updateUser(selectedUserId, { role: '管理者' });
      if (result) {
        setShowAlert(false);
      }
    } catch (error) {
      console.error('管理者設定に失敗しました:', error);
    }
  };

  if (!showAlert) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-bold text-red-600 mb-4">
          管理者が存在しません
        </h3>
        <p className="mb-4 text-secondary-700">
          会社アカウントには最低1名以上の管理者が必要です。
          管理者に設定するユーザーを選択してください。
        </p>
        
        <div className="mb-4">
          <label htmlFor="adminUser" className="block text-sm font-medium text-secondary-700 mb-1">
            管理者に設定するユーザー
          </label>
          <select
            id="adminUser"
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">選択してください</option>
            {nonAdminUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.role})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSetAdmin}
            disabled={!selectedUserId}
            className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              !selectedUserId ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            管理者に設定する
          </button>
        </div>
      </div>
    </div>
  );
};
