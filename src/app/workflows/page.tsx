'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '../../components/layouts/DashboardLayout'
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

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [companyName, setCompanyName] = useState('株式会社サンプル')
  const [showCompleted, setShowCompleted] = useState(false)
  const router = useRouter()
  const { users, getUserById, currentUser } = useUser()
  
  // デバッグ用：ユーザー情報とワークフローの作成者情報を確認
  useEffect(() => {
    console.log('Current User:', currentUser)
    console.log('All Users:', users)
    console.log('Workflows:', workflows)
    
    // 注意: ユーザーデータが存在しない場合でも、ページをリロードしないようにしました
    // これにより無限ループを防止します
  }, [currentUser, users, workflows])
  
  // 会社情報を取得
  useEffect(() => {
    // ローカルストレージから会社情報を取得
    const savedCompanyInfo = localStorage.getItem('kaizen_company_info')
    if (savedCompanyInfo) {
      try {
        const companyInfo = JSON.parse(savedCompanyInfo)
        setCompanyName(companyInfo.name)
      } catch (error) {
        console.error('会社情報の解析エラー:', error)
      }
    }
  }, [])
  
  // Supabaseからワークフローを取得
  const loadWorkflows = async () => {
    try {
      // 認証状態をチェック
      if (!currentUser) {
        console.log('ユーザーが認証されていません。ワークフローの取得をスキップします。');
        return;
      }
      
      // APIを呼び出してワークフローを取得
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched workflows from Supabase:', data);
      
      // Supabaseのカラム名をアプリケーションの命名規則に合わせて変換
      const formattedWorkflows: Workflow[] = data.map((wf: any) => ({
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
        
      setWorkflows(sortedWorkflows);
    } catch (error) {
      console.error('ワークフローの取得エラー:', error);
    }
  };

  // 初回レンダリング時とユーザーデータが変更されたときにワークフローリストを更新
  useEffect(() => {
    loadWorkflows();
  }, [currentUser]); // currentUserが変更されたときにも再実行

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
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">業務フロー一覧</h1>
          <p className="text-secondary-600">登録されている業務フローの一覧です</p>
        </div>
        
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
            onClick={() => router.push('/?workflowId=new')}
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
                          {displayWorkflow.createdBy ? (
                            <div className="flex items-center mb-2">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800">
                                  {getUserById(displayWorkflow.createdBy)?.fullName?.charAt(0) || '?'}
                                </div>
                              </div>
                              <div className="ml-2">
                                <div className="text-sm font-medium text-secondary-900">
                                  {getUserById(displayWorkflow.createdBy)?.fullName || '不明なユーザー'}
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
                                  {displayCollaborators.map((collab: any) => (
                                    <div key={collab.id} className="flex items-center mb-1">
                                      <div className="flex-shrink-0 h-6 w-6">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-xs">
                                          {getUserById(collab.user_id)?.fullName?.charAt(0) || '?'}
                                        </div>
                                      </div>
                                      <div className="ml-2">
                                        <div className="text-xs font-medium text-secondary-900">
                                          {getUserById(collab.user_id)?.fullName || '不明なユーザー'}
                                        </div>
                                        <div className="text-xs text-secondary-500">
                                          {collab.permission_type === 'edit' ? '編集者' : '閲覧者'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  
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
                              
                              // APIを呼び出して更新
                              const response = await fetch('/api/workflows', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  id: displayWorkflow.id,
                                  isCompleted: isCompleted,
                                  // 他の必要なフィールド
                                  name: displayWorkflow.name,
                                  description: displayWorkflow.description,
                                  steps: displayWorkflow.steps,
                                  isImproved: displayWorkflow.isImproved,
                                  originalId: displayWorkflow.originalId
                                }),
                              });
                              
                              if (!response.ok) {
                                throw new Error(`API error: ${response.status}`);
                              }
                              
                              // 状態を更新
                              loadWorkflows();
                            } catch (error) {
                              console.error('ワークフローの更新エラー:', error);
                              alert('ワークフローの更新に失敗しました');
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
                          onClick={() => router.push(`/?workflowId=${displayWorkflow.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          編集
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
      </div>
    </DashboardLayout>
  )
}
