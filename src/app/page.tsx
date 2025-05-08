'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '../components/layouts/DashboardLayout'
import { WorkflowEditor } from '../components/workflow/WorkflowEditor'
import { ChatInterface } from '../components/chat/ChatInterface'
import { useUser } from '@/contexts/UserContext'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
}

interface Workflow {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  steps: WorkflowStep[]
  isImproved?: boolean
  originalId?: string
  isCompleted?: boolean
  completedAt?: Date
  createdBy?: string // 作成者のユーザーID
}

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [companyName, setCompanyName] = useState('株式会社サンプル')
  const [showCompleted, setShowCompleted] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const router = useRouter()
  const { users, getUserById, currentUser } = useUser()
  
  // 会社情報と従業員情報を取得
  useEffect(() => {
    // ローカルストレージから会社情報を取得
    const savedCompanyInfo = localStorage.getItem('kaizen_company_info')
    
    if (savedCompanyInfo) {
      try {
        const parsedCompanyInfo = JSON.parse(savedCompanyInfo)
        
        // 会社情報の検証
        if (typeof parsedCompanyInfo !== 'object' || parsedCompanyInfo === null) {
          throw new Error('Company info is not an object')
        }
        
        setCompanyInfo(parsedCompanyInfo)
        setCompanyName(parsedCompanyInfo.name || '株式会社サンプル')
      } catch (error) {
        console.error('会社情報の解析エラー:', error)
        // デフォルトの会社情報を設定
        const defaultCompanyInfo = {
          name: '株式会社サンプル',
          industry: 'IT',
          size: '50-100人',
          address: '東京都渋谷区',
          businessDescription: 'ビジネスプロセス改善ソリューションの提供'
        }
        setCompanyInfo(defaultCompanyInfo)
      }
    } else {
      // 会社情報がない場合はデフォルト値を設定
      const defaultCompanyInfo = {
        name: '株式会社サンプル',
        industry: 'IT',
        size: '50-100人',
        address: '東京都渋谷区',
        businessDescription: 'ビジネスプロセス改善ソリューションの提供'
      }
      setCompanyInfo(defaultCompanyInfo)
    }
    
    // ローカルストレージから従業員情報を取得
    const savedEmployees = localStorage.getItem('kaizen_employees')
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees)
        setEmployees(parsedEmployees)
      } catch (error) {
        console.error('従業員情報の解析エラー:', error)
        // デフォルトの従業員情報を設定
        const defaultEmployees = [
          {
            id: '1',
            name: '山田太郎',
            position: '営業部長',
            department: '営業部',
            hourlyRate: 3000
          }
        ]
        setEmployees(defaultEmployees)
      }
    } else {
      // 従業員情報がない場合はデフォルト値を設定
      const defaultEmployees = [
        {
          id: '1',
          name: '山田太郎',
          position: '営業部長',
          department: '営業部',
          hourlyRate: 3000
        }
      ]
      setEmployees(defaultEmployees)
    }
  }, [])

  // URLからワークフローIDを取得
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const workflowId = urlParams.get('workflowId')
      if (workflowId) {
        setActiveWorkflow(workflowId)
        // クエリパラメータをクリア
        router.replace('/')
      }
    }
  }, [router])

  // Supabaseからワークフローを取得
  const loadWorkflows = async () => {
    try {
      // 直接Supabaseクライアントを使用してワークフローを取得
      const response = await fetch('/api/workflows/supabase-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_workflows',
          params: {}
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      console.log('Fetched workflows from Supabase:', result);
      
      if (!result || !Array.isArray(result)) {
        console.error('Invalid response format:', result);
        return;
      }
      
      // Supabaseのカラム名をアプリケーションの命名規則に合わせて変換
      const formattedWorkflows: Workflow[] = result.map((wf: any) => ({
        id: wf.id,
        name: wf.name,
        description: wf.description,
        steps: wf.steps || [],
        createdAt: new Date(wf.created_at),
        updatedAt: new Date(wf.updated_at),
        isImproved: wf.is_improved || false,
        originalId: wf.original_id || undefined,
        isCompleted: wf.is_completed || false,
        completedAt: wf.completed_at ? new Date(wf.completed_at) : undefined,
        createdBy: wf.created_by,
        collaborators: wf.collaborators || []
      }));
      
      // 最新順にソート
      const sortedWorkflows = formattedWorkflows
        .sort((a: Workflow, b: Workflow) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      // ローカルストレージにも保存（詳細ページでの表示用）
      localStorage.setItem('workflows', JSON.stringify(sortedWorkflows));
        
      setWorkflows(sortedWorkflows);
    } catch (error) {
      console.error('ワークフローの取得エラー:', error);
      alert(`ワークフローの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // 初回レンダリング時とアクティブワークフローが変更されたときにワークフローリストを更新
  useEffect(() => {
    loadWorkflows();
  }, [activeWorkflow, users]);

  // ローカルストレージの変更を監視
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workflows') {
        loadWorkflows();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // ワークフローを削除
  const handleDeleteWorkflow = async (id: string) => {
    try {
      // 削除前に確認
      if (!confirm('このワークフローを削除してもよろしいですか？この操作は元に戻せません。')) {
        return;
      }
      
      // 直接Supabaseクライアントを使用して削除
      const response = await fetch('/api/workflows/supabase-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'delete_workflow',
          params: {
            id: id
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      console.log('Deleted workflow:', result);
      
      // 状態を更新
      setWorkflows(workflows.filter(wf => wf.id !== id));
      alert('ワークフローを削除しました');
    } catch (error) {
      console.error('ワークフローの削除エラー:', error);
      alert(`ワークフローの削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // 検索条件と完了状態に一致するワークフローをフィルタリング
  const filteredWorkflows = workflows.filter(workflow => {
    // 検索条件に一致するか
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 完了状態に応じたフィルタリング
    // showCompletedがfalseの場合は未完了のもののみ表示
    // showCompletedがtrueの場合は完了済みも含めて全て表示
    const matchesCompletionStatus = showCompleted || !workflow.isCompleted;
    
    return matchesSearch && matchesCompletionStatus;
  });

  // ワークフローをグループ化する関数
  const groupWorkflows = () => {
    const workflowGroups = new Map()
    
    // 改善後のワークフローを元のワークフローIDでグループ化
    filteredWorkflows.forEach(workflow => {
      if (workflow.isImproved && workflow.originalId) {
        if (!workflowGroups.has(workflow.originalId)) {
          workflowGroups.set(workflow.originalId, {
            original: null,
            improved: workflow
          })
        } else {
          workflowGroups.get(workflow.originalId).improved = workflow
        }
      }
    })
    
    // 元のワークフローを追加
    filteredWorkflows.forEach(workflow => {
      if (!workflow.isImproved) {
        if (!workflowGroups.has(workflow.id)) {
          workflowGroups.set(workflow.id, {
            original: workflow,
            improved: null
          })
        } else {
          workflowGroups.get(workflow.id).original = workflow
        }
      }
    })
    
    return Array.from(workflowGroups.entries())
  }
  
  const workflowGroups = groupWorkflows()

  return (
    <DashboardLayout companyName={companyName}>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* メインコンテンツ */}
        <div className={`flex-1 flex ${isChatOpen ? 'pr-96' : ''} transition-all duration-300 ease-in-out`}>
          <div className="flex-1 overflow-auto p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-secondary-900">ホーム</h1>
              <p className="text-secondary-600">業務フローの改善を始めましょう</p>
            </div>

            {activeWorkflow ? (
              <WorkflowEditor workflowId={activeWorkflow} onClose={() => setActiveWorkflow(null)} />
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center flex-1">
                    <div className="max-w-md mr-4">
                      <input
                        type="text"
                        placeholder="業務フローを検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showCompleted"
                        checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="showCompleted" className="text-sm text-secondary-600">
                        完了済みを表示
                      </label>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary ml-4"
                    onClick={() => setActiveWorkflow('new')}
                  >
                    新規作成
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200 table-fixed">
                    <thead className="bg-blue-50 border-b-2 border-blue-200">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/6">
                          フロー名
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/6">
                          説明
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/6">
                          ステップ数
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/6">
                          最終更新日
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/6">
                          作成者
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/6">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {workflowGroups.length > 0 ? (
                        workflowGroups.map(([groupId, group]) => {
                          const { original, improved } = group
                          
                          // 表示するワークフロー（元のワークフローを優先）
                          const displayWorkflow = original || improved
                          if (!displayWorkflow) return null
                          
                          return (
                            <tr key={groupId} className="hover:bg-secondary-50">
                              <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                                <Link 
                                  href={`/workflows/${displayWorkflow.id}`}
                                  className="text-sm font-medium text-secondary-900 hover:text-primary-600"
                                >
                                  {displayWorkflow.name}
                                  {improved && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                      改善案あり
                                    </span>
                                  )}
                                </Link>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-secondary-500 line-clamp-2">{displayWorkflow.description}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                                <div className="text-sm text-secondary-500">{displayWorkflow.steps?.length || 0}ステップ</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-secondary-500">
                                  {displayWorkflow.updatedAt.toLocaleDateString('ja-JP')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  {/* 作成者 */}
                                  {displayWorkflow.createdBy && getUserById && getUserById(displayWorkflow.createdBy) ? (
                                    <div className="flex items-center mb-2">
                                      <div className="flex-shrink-0 h-8 w-8">
                                        {getUserById(displayWorkflow.createdBy)?.profileImage ? (
                                          <img
                                            className="h-8 w-8 rounded-full"
                                            src={getUserById(displayWorkflow.createdBy)?.profileImage}
                                            alt={`${getUserById(displayWorkflow.createdBy)?.fullName}のプロフィール画像`}
                                          />
                                        ) : (
                                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800">
                                            {getUserById(displayWorkflow.createdBy)?.fullName.charAt(0)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="ml-2">
                                        <div className="text-sm font-medium text-secondary-900">
                                          {getUserById(displayWorkflow.createdBy)?.fullName}
                                        </div>
                                        <div className="text-xs text-secondary-500">作成者</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-secondary-500 mb-2">作成者: 未設定</div>
                                  )}
                                  
                                  {/* 共同編集者 */}
                                  {(() => {
                                    // 共同編集者情報を取得
                                    const collaborators = displayWorkflow.collaborators || [];
                                    
                                    if (collaborators.length > 0) {
                                      // 最大2人まで表示
                                      const displayCollaborators = collaborators.slice(0, 2);
                                      const remainingCount = collaborators.length - 2;
                                      
                                      return (
                                        <div>
                                          {displayCollaborators.map((collab: any) => {
                                            // app_usersテーブルからユーザー情報を取得
                                            const user = getUserById && getUserById(collab.user_id);
                                            
                                            return (
                                              <div key={collab.id} className="flex items-center mb-1">
                                                <div className="flex-shrink-0 h-6 w-6">
                                                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-xs">
                                                    {user?.fullName?.charAt(0) || '?'}
                                                  </div>
                                                </div>
                                                <div className="ml-2">
                                                  <div className="text-xs font-medium text-secondary-900">
                                                    {user?.fullName || '不明なユーザー'}
                                                  </div>
                                                  <div className="text-xs text-secondary-500">
                                                    {collab.permission_type === 'edit' ? '編集者' : '閲覧者'}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                          
                                          {remainingCount > 0 && (
                                            <div className="text-xs text-secondary-500 mt-1">
                                              他 {remainingCount} 名の共同編集者
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    
                                    return (
                                      <div className="text-xs text-secondary-500">
                                        <button 
                                          onClick={() => router.push(`/workflows/${displayWorkflow.id}`)}
                                          className="text-primary-600 hover:text-primary-800"
                                        >
                                          + 共同編集者を追加
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={async () => {
                                    // ワークフローの完了状態を切り替える
                                    try {
                                      const isCompleted = !displayWorkflow.isCompleted;
                                      
                                      // 直接Supabaseクライアントを使用して更新
                                      const response = await fetch('/api/workflows/supabase-mcp', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          operation: 'update_workflow_completion',
                                          params: {
                                            id: displayWorkflow.id,
                                            isCompleted: isCompleted
                                          }
                                        }),
                                      });
                                      
                                      if (!response.ok) {
                                        const errorData = await response.json();
                                        console.error('API response error:', errorData);
                                        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                                      }
                                      
                                      const result = await response.json();
                                      console.log('Updated workflow completion status:', result);
                                      
                                      // 状態を更新
                                      loadWorkflows();
                                      
                                      // 完了状態の変更を通知
                                      alert(isCompleted ? 'ワークフローを完了済みに設定しました' : 'ワークフローを未完了に設定しました');
                                    } catch (error) {
                                      console.error('ワークフローの更新エラー:', error);
                                      alert(`ワークフローの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
                                    }
                                  }}
                                  className={`${
                                    displayWorkflow.isCompleted 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  } px-3 py-1 text-sm rounded transition-colors mr-2`}
                                >
                                  {displayWorkflow.isCompleted ? '完了済み' : '完了'}
                                </button>
                                <Link
                                  href={`/workflows/${displayWorkflow.id}`}
                                  className="text-primary-600 hover:text-primary-900 mr-2"
                                >
                                  詳細
                                </Link>
                                <button
                                  onClick={() => setActiveWorkflow(displayWorkflow.id)}
                                  className="text-primary-600 hover:text-primary-900 mr-2"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkflow(displayWorkflow.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  削除
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-secondary-500">
                            {searchTerm ? '検索条件に一致する業務フローはありません' : '保存された業務フローはありません'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-secondary-900 mb-4">業務フローの活用方法</h2>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <div className="text-primary-600 text-lg font-medium mb-2">1. 現状の業務フローを登録</div>
                        <p className="text-secondary-600 text-sm">
                          現在の業務の流れをステップごとに登録し、担当者や所要時間を記録します。
                        </p>
                      </div>
                      <div className="flex flex-col">
                        <div className="text-primary-600 text-lg font-medium mb-2">2. AIによる改善提案</div>
                        <p className="text-secondary-600 text-sm">
                          登録した業務フローをAIが分析し、効率化や自動化の提案を行います。
                        </p>
                      </div>
                      <div className="flex flex-col">
                        <div className="text-primary-600 text-lg font-medium mb-2">3. 改善後の効果確認</div>
                        <p className="text-secondary-600 text-sm">
                          改善前後の比較で、時間短縮や自動化によるコスト削減効果を確認できます。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* チャットインターフェース - 直接配置 */}
        <ChatInterface 
          companyInfo={companyInfo}
          employees={employees}
          onOpenChange={setIsChatOpen}
          workflowContext={activeWorkflow && activeWorkflow !== 'new' ? (() => {
            const currentWorkflow = workflows.find(w => w.id === activeWorkflow);
            if (!currentWorkflow) return undefined;
            
            // 関連するワークフローを検索（改善前/改善後）
            let relatedWorkflow = undefined;
            if (currentWorkflow.isImproved && currentWorkflow.originalId) {
              // 改善後のワークフローの場合、元のワークフローを検索
              relatedWorkflow = workflows.find(w => w.id === currentWorkflow.originalId);
            } else {
              // 元のワークフローの場合、改善後のワークフローを検索
              relatedWorkflow = workflows.find(
                w => w.originalId === currentWorkflow.id && w.isImproved
              );
            }
            
            return {
              id: currentWorkflow.id,
              name: currentWorkflow.name,
              description: currentWorkflow.description,
              steps: currentWorkflow.steps,
              isImproved: currentWorkflow.isImproved,
              originalId: currentWorkflow.originalId,
              relatedWorkflow: relatedWorkflow ? {
                id: relatedWorkflow.id,
                name: relatedWorkflow.name,
                description: relatedWorkflow.description,
                steps: relatedWorkflow.steps,
                createdAt: relatedWorkflow.createdAt,
                updatedAt: relatedWorkflow.updatedAt,
                isImproved: relatedWorkflow.isImproved,
                originalId: relatedWorkflow.originalId
              } : undefined
            };
          })() : undefined}
        />
      </div>
    </DashboardLayout>
  )
}
