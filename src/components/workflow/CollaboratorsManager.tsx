'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import { supabase } from '@/lib/supabaseClient'

interface CollaboratorsManagerProps {
  workflowId: string;
  createdBy: string;
  accessLevel: string;
  onAccessLevelChange: (accessLevel: string) => Promise<boolean>;
  onAddCollaborator: (userId: string, permissionType: 'edit' | 'view') => Promise<boolean>;
  onRemoveCollaborator: (collaboratorId: string) => Promise<boolean>;
  collaborators: any[];
}

export const CollaboratorsManager: React.FC<CollaboratorsManagerProps> = ({
  workflowId,
  createdBy,
  accessLevel,
  onAccessLevelChange,
  onAddCollaborator,
  onRemoveCollaborator,
  collaborators
}) => {
  const { users, currentUser } = useUser();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissionType, setPermissionType] = useState<'edit' | 'view'>('edit');
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [appUsers, setAppUsers] = useState<any[]>([]);
  
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
  
  // app_usersテーブルからユーザー一覧と部署一覧を取得
  useEffect(() => {
    const fetchUsersAndDepartments = async () => {
      if (!currentUser?.companyId) return;
      
      const client = supabase();
      const { data, error } = await client
        .from('app_users')
        .select('*')
        .eq('company_id', currentUser.companyId);
        
      if (error) {
        console.error('ユーザー一覧の取得エラー:', error);
        return;
      }
      
      // ユーザー一覧を設定
      setAppUsers(data);
      
      // 部署一覧を取得（重複を除去）
      const departmentValues = data
        .filter(user => user.department)
        .map(user => user.department);
      const uniqueDepartments = Array.from(new Set(departmentValues));
      setDepartments(uniqueDepartments as string[]);
    };
    
    fetchUsersAndDepartments();
  }, [currentUser]);
  
  // 個別ユーザーの招待
  const handleAddCollaborator = async () => {
    if (!selectedUserId) return;
    
    setIsLoading(true);
    try {
      const success = await onAddCollaborator(selectedUserId, permissionType);
      if (success) {
        setSelectedUserId('');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // アクセスレベルの変更
  const handleAccessLevelChange = async (newLevel: string) => {
    if (newLevel === accessLevel) return;
    
    setIsLoading(true);
    try {
      const success = await onAccessLevelChange(newLevel);
      if (!success) {
        alert('アクセスレベルの変更に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 権限チェック
  const canInviteDepartment = currentUser?.role === 'マネージャー' || currentUser?.role === '管理者';
  const canInviteCompany = currentUser?.role === '管理者';
  const isCreator = currentUser?.id === createdBy;
  
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 w-full">
      <h2 className="text-xl font-semibold mb-4">共同編集者管理</h2>
      
      {/* 現在のアクセスレベル表示 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <h3 className="font-medium text-blue-800">現在の共有設定</h3>
        <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center'} mt-2`}>
          <select
            value={accessLevel}
            onChange={(e) => handleAccessLevelChange(e.target.value)}
            className={`p-2 border rounded ${isMobile ? 'w-full' : ''}`}
            disabled={!isCreator && !canInviteDepartment}
          >
            <option value="user">個別ユーザーのみ</option>
            {canInviteDepartment && <option value="department">部署内で共有</option>}
            {canInviteCompany && <option value="company">会社全体で共有</option>}
          </select>
          <p className={`${isMobile ? 'mt-1' : 'ml-3'} text-sm text-gray-600`}>
            {accessLevel === 'user' && '選択したユーザーのみがアクセスできます'}
            {accessLevel === 'department' && '同じ部署のメンバー全員がアクセスできます'}
            {accessLevel === 'company' && '会社の全メンバーがアクセスできます'}
          </p>
        </div>
      </div>
      
      {/* 個別ユーザー招待 */}
      <div className="mb-6 p-4 border rounded-md">
        <h3 className="font-medium mb-2">ユーザーを招待</h3>
        <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex flex-wrap gap-2'}`}>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className={`${isMobile ? 'w-full' : 'flex-1'} p-2 border rounded`}
          >
            <option value="">ユーザーを選択...</option>
            {appUsers
              .filter(user => user.id !== currentUser?.id && !collaborators.some(c => c.userId === user.id))
              .map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username} ({user.email})
                </option>
              ))
            }
          </select>
          <select
            value={permissionType}
            onChange={(e) => setPermissionType(e.target.value as 'edit' | 'view')}
            className={`${isMobile ? 'w-full' : 'w-32'} p-2 border rounded`}
          >
            <option value="edit">編集可能</option>
            <option value="view">閲覧のみ</option>
          </select>
          <button
            onClick={handleAddCollaborator}
            disabled={!selectedUserId || isLoading}
            className={`${isMobile ? 'w-full' : ''} px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400`}
          >
            招待
          </button>
        </div>
      </div>
      
      {/* 共同編集者一覧 */}
      <div className="mt-6">
        <h3 className="font-medium mb-2">現在の共同編集者</h3>
        {collaborators.length > 0 ? (
          <ul className="divide-y">
            {collaborators.map(collab => {
              // app_usersテーブルからユーザー情報を取得（補足情報として）
              const collaboratorUser = appUsers.find(user => user.id === collab.userId);
              
              // workflow_collaboratorsテーブルのfull_nameを優先的に使用
              const displayName = collab.full_name || 
                (collaboratorUser ? (collaboratorUser.full_name || collaboratorUser.username) : '不明なユーザー');
              
              return (
                <li key={collab.id} className={`py-2 ${isMobile ? 'flex flex-col space-y-2' : 'flex justify-between items-center'}`}>
                  <div className={isMobile ? 'space-y-1' : ''}>
                    <div className="flex flex-wrap items-center">
                      <span className="font-medium">
                        {displayName}
                      </span>
                      <span className={`${isMobile ? 'ml-0 block text-xs' : 'ml-2'} text-sm text-gray-500`}>
                        {collaboratorUser?.email || ''}
                      </span>
                    </div>
                    <span className={`${isMobile ? 'mt-1 inline-block' : 'ml-2'} px-2 py-0.5 text-xs rounded ${
                      collab.permissionType === 'edit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {collab.permissionType === 'edit' ? '編集可能' : '閲覧のみ'}
                    </span>
                  </div>
                  {(isCreator || currentUser?.role === '管理者') && (
                    <button
                      onClick={() => onRemoveCollaborator(collab.id)}
                      className={`text-red-600 hover:text-red-800 ${isMobile ? 'py-1 px-2 border border-red-200 rounded text-sm' : ''}`}
                    >
                      削除
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 p-4 bg-gray-50 rounded-md text-center">共同編集者はまだいません</p>
        )}
      </div>
    </div>
  );
};
