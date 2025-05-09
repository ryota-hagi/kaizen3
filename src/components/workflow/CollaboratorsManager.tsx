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
      // 本番環境かどうかを判定
      const isProduction = typeof window !== 'undefined' && (
        window.location.hostname.includes('vercel.app') || 
        window.location.hostname !== 'localhost'
      );
      
      if (isProduction) {
        // 本番環境の場合は、直接MCPを使用してデータベースに挿入
        try {
          console.log('本番環境でMCPを使用して共同編集者を追加します');
          console.log('ホスト名:', window.location.hostname);
          
          // まず、app_usersテーブルからユーザー情報を取得
          // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
          const userResult = await global.use_mcp_tool(
            'github.com/supabase-community/supabase-mcp',
            'execute_sql',
            {
              project_id: 'czuedairowlwfgbjmfbg',
              query: `
                SELECT full_name FROM app_users WHERE id = '${selectedUserId}';
              `
            }
          );
          
          console.log('ユーザー情報取得結果:', userResult);
          
          // ユーザー名を取得（存在しない場合はデフォルト値を使用）
          let userName = '';
          if (userResult && userResult.length > 0 && userResult[0].full_name) {
            userName = userResult[0].full_name;
          } else {
            // app_usersテーブルに存在しない場合は、authテーブルから取得を試みる
            try {
              // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
              const authResult = await global.use_mcp_tool(
                'github.com/supabase-community/supabase-mcp',
                'execute_sql',
                {
                  project_id: 'czuedairowlwfgbjmfbg',
                  query: `
                    SELECT raw_user_meta_data->>'full_name' as full_name
                    FROM auth.users
                    WHERE id = '${selectedUserId}';
                  `
                }
              );
              
              console.log('Auth情報取得結果:', authResult);
              
              if (authResult && authResult.length > 0 && authResult[0].full_name) {
                userName = authResult[0].full_name;
              } else {
                // デフォルト値を設定
                userName = 'ユーザー';
              }
            } catch (authError) {
              console.error('Auth情報取得エラー:', authError);
              userName = 'ユーザー';
            }
          }
          
          // workflow_collaboratorsテーブルに挿入
          // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
          const result = await global.use_mcp_tool(
            'github.com/supabase-community/supabase-mcp',
            'execute_sql',
            {
              project_id: 'czuedairowlwfgbjmfbg',
              query: `
                INSERT INTO workflow_collaborators (workflow_id, user_id, permission_type, full_name)
                VALUES ('${workflowId}', '${selectedUserId}', '${permissionType}', '${userName}')
                ON CONFLICT (workflow_id, user_id) 
                DO UPDATE SET permission_type = '${permissionType}', full_name = '${userName}'
                RETURNING *;
              `
            }
          );
          
          console.log('共同編集者追加結果:', result);
          setSelectedUserId('');
          
          // 共同編集者リストを再取得
          try {
            // @ts-ignore - グローバルスコープでuse_mcp_toolが利用可能
            const collaboratorsResult = await global.use_mcp_tool(
              'github.com/supabase-community/supabase-mcp',
              'execute_sql',
              {
                project_id: 'czuedairowlwfgbjmfbg',
                query: `
                  SELECT wc.*, au.full_name as user_full_name, au.email as user_email
                  FROM workflow_collaborators wc
                  LEFT JOIN app_users au ON wc.user_id = au.id
                  WHERE wc.workflow_id = '${workflowId}';
                `
              }
            );
            
            console.log('共同編集者リスト取得結果:', collaboratorsResult);
            
            // 共同編集者リストを更新
            if (collaboratorsResult && collaboratorsResult.length > 0) {
              const formattedData = collaboratorsResult.map((collab: any) => ({
                id: collab.id,
                workflowId: collab.workflow_id,
                userId: collab.user_id,
                permissionType: collab.permission_type,
                addedAt: collab.added_at,
                addedBy: collab.added_by,
                full_name: collab.full_name || collab.user_full_name || '',
                user: {
                  id: collab.user_id,
                  full_name: collab.user_full_name || '',
                  email: collab.user_email || ''
                }
              }));
              
              // 親コンポーネントのcollaboratorsステートを更新
              // onAddCollaboratorを呼び出さずに直接更新
              // ここでは親コンポーネントのcollaboratorsを直接更新できないため、
              // 親コンポーネントでfetchCollaboratorsを呼び出す
              onAddCollaborator(selectedUserId, permissionType);
            }
          } catch (fetchError) {
            console.error('共同編集者リスト取得エラー:', fetchError);
          }
          
          return true;
        } catch (mcpError) {
          console.error('MCP実行エラー:', mcpError);
          alert(`共同編集者の追加に失敗しました: ${mcpError instanceof Error ? mcpError.message : '不明なエラー'}`);
          return false;
        }
      } else {
        // ローカル環境の場合は、通常のAPIを使用
        console.log('ローカル環境でAPIを使用して共同編集者を追加します');
        const success = await onAddCollaborator(selectedUserId, permissionType);
        if (success) {
          setSelectedUserId('');
        }
        return success;
      }
    } catch (error) {
      console.error('共同編集者追加エラー:', error);
      alert(`共同編集者の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
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
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">共同編集者管理</h2>
      
      {/* 現在のアクセスレベル表示 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <h3 className="font-medium text-blue-800">現在の共有設定</h3>
        <div className="flex items-center mt-2">
          <select
            value={accessLevel}
            onChange={(e) => handleAccessLevelChange(e.target.value)}
            className="p-2 border rounded"
            disabled={!isCreator && !canInviteDepartment}
          >
            <option value="user">個別ユーザーのみ</option>
            {canInviteDepartment && <option value="department">部署内で共有</option>}
            {canInviteCompany && <option value="company">会社全体で共有</option>}
          </select>
          <p className="ml-3 text-sm text-gray-600">
            {accessLevel === 'user' && '選択したユーザーのみがアクセスできます'}
            {accessLevel === 'department' && '同じ部署のメンバー全員がアクセスできます'}
            {accessLevel === 'company' && '会社の全メンバーがアクセスできます'}
          </p>
        </div>
      </div>
      
      {/* 個別ユーザー招待 */}
      <div className="mb-6 p-4 border rounded-md">
        <h3 className="font-medium mb-2">ユーザーを招待</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 p-2 border rounded"
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
            className="w-32 p-2 border rounded"
          >
            <option value="edit">編集可能</option>
            <option value="view">閲覧のみ</option>
          </select>
          <button
            onClick={handleAddCollaborator}
            disabled={!selectedUserId || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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
                <li key={collab.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-medium">
                      {displayName}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {collaboratorUser?.email || ''}
                    </span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                      collab.permissionType === 'edit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {collab.permissionType === 'edit' ? '編集可能' : '閲覧のみ'}
                    </span>
                  </div>
                  {(isCreator || currentUser?.role === '管理者') && (
                    <button
                      onClick={() => onRemoveCollaborator(collab.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">共同編集者はまだいません</p>
        )}
      </div>
    </div>
  );
};
