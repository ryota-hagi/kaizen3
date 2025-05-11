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
  company_id?: string // 会社ID
  collaborators?: any[] // 共同編集者情報
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
  const { users, getUserById, currentUser, isAuthenticated } = useUser()
  
  // 認証状態をチェックし、未ログインならリダイレクト
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // セッションを明示的に検証
        const { validateSession } = await import('@/lib/supabaseClient');
        const { valid, session } = await validateSession();
        
        if (valid && session) {
          console.log('有効なセッションを検出しました。リダイレクトをスキップします。');
          return;
        }
        
        // ローカルストレージからユーザー情報を取得
        const storedUserStr = localStorage.getItem('kaizen_user');
        if (storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser && storedUser.id) {
              console.log('ストレージからユーザー情報を復元しました。リダイレクトをスキップします。');
              return;
            }
          } catch (e) {
            console.error('ストレージからのユーザー情報の解析エラー:', e);
          }
        }
        
        // 認証状態をチェック
        if (!isAuthenticated && !currentUser) {
          console.log('未ログイン状態を検出しました。ログインページにリダイレクトします。');
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('認証チェック中にエラーが発生しました:', error);
      }
    };
    
    checkAuthAndRedirect();
  }, [isAuthenticated, currentUser, router])
  
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
          params: {
            company_id: currentUser?.companyId
          }
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
      
      // 各ワークフローの共同編集者情報を取得
      const workflowsWithCollaborators = await Promise.all(
        result.map(async (wf: any) => {
          // 共同編集者情報を取得
          const collabResponse = await fetch(`/api/workflows/collaborators?workflowId=${wf.id}`);
          let collaborators = [];
          
          if (collabResponse.ok) {
            collaborators = await collabResponse.json();
            console.log(`Fetched collaborators for workflow ${wf.id}:`, collaborators);
          } else {
            console.error(`Failed to fetch collaborators for workflow ${wf.id}`);
          }
          
          return {
            ...wf,
            collaborators
          };
        })
      );
      
      // Supabaseのカラム名をアプリケーションの命名規則に合わせて変換
      const formattedWorkflows: Workflow[] = workflowsWithCollaborators.map((wf: any) => ({
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
        collaborators: wf.collaborators || [],
        company_id: wf.company_id || null
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
    
    // 会社IDが一致するか（nullの場合は除外）
    const matchesCompanyId = workflow.company_id !== null && workflow.company_id === currentUser?.companyId;
    
    return matchesSearch && matchesCompletionStatus && matchesCompanyId;
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
                
                <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-secondary-200">
                  <table className="min-w-full divide-y divide-secondary-200 table-fixed">
                    <thead className="bg-primary-600">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/6">
                          フロー名
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/6">
                          説明
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/6">
                          ステップ数
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/6">
                          最終更新日
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/6">
                          作成者
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider w-1/6">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-100">
                      {workflowGroups.length > 0 ? (
                        workflowGroups.map(([groupId, group]) => {
                          const { original, improved } = group
                          
                          // 表示するワークフロー（元のワークフローを優先）
                          const displayWorkflow = original || improved
                          if (!displayWorkflow) return null
                          
                          return (
                            <tr key={groupId} className="hover:bg-secondary-50 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap border-l-4 border-primary-500">
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
                                <div className="text-sm text-secondary-600 line-clamp-2">{displayWorkflow.description}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-primary-600 bg-primary-50 py-1 px-3 rounded-md inline-block">
                                  {displayWorkflow.steps?.length || 0}ステップ
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-secondary-600">
                                  {displayWorkflow.updatedAt.toLocaleDateString('ja-JP')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  {/* 作成者と共同編集者を横に並べる */}
                                  <div className="flex items-center">
                                    {/* 作成者 - ユーザーコンテキストから取得した作成者情報を使用 */}
                                    {displayWorkflow.createdBy && getUserById && getUserById(displayWorkflow.createdBy) ? (
                                      <div className="flex items-center group relative">
                                        <div className="flex-shrink-0 h-8 w-8 shadow-sm rounded-full border border-secondary-200 z-10">
                                          {getUserById(displayWorkflow.createdBy)?.profileImage ? (
                                            <img
                                              className="h-full w-full rounded-full object-cover"
                                              src={getUserById(displayWorkflow.createdBy)?.profileImage}
                                              alt={`${getUserById(displayWorkflow.createdBy)?.fullName}のプロフィール画像`}
                                            />
                                          ) : (
                                            <div className="h-full w-full rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                                              {getUserById(displayWorkflow.createdBy)?.fullName.charAt(0)}
                                            </div>
                                          )}
                                        </div>
                                        <div className="absolute bottom-full left-0 mb-2 w-40 bg-secondary-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                          <p className="font-medium">{getUserById(displayWorkflow.createdBy)?.fullName}</p>
                                          <p>作成者</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-200 flex items-center justify-center text-secondary-500 shadow-sm border border-secondary-200 z-10">
                                        <span className="text-xs">?</span>
                                      </div>
                                    )}
                                    
                                    {/* 共同編集者 - 横に並べる */}
                                    {(() => {
                                      // 共同編集者情報を取得
                                      const collaborators = displayWorkflow.collaborators || [];
                                      
                                      if (collaborators.length > 0) {
                                        // 最大3人まで表示
                                        const displayCollaborators = collaborators.slice(0, 3);
                                        const remainingCount = collaborators.length - 3;
                                        
                                        return (
                                          <div className="flex -ml-2">
                                            {displayCollaborators.map((collab: any, index: number) => (
                                              <div key={collab.id} className="group relative" style={{ zIndex: 10 - index }}>
                                                {collab.full_name ? (
                                                  <div className="flex-shrink-0 h-8 w-8 rounded-full border border-secondary-200 shadow-sm -ml-1">
                                                    <div className="h-full w-full rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                                                      {collab.full_name.charAt(0)}
                                                    </div>
                                                  </div>
                                                ) : null}
                                                <div className="absolute bottom-full left-0 mb-2 w-40 bg-secondary-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                  <p className="font-medium">{collab.full_name}</p>
                                                  <p>共同編集者</p>
                                                </div>
                                              </div>
                                            ))}
                                            
                                            {remainingCount > 0 && (
                                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-200 border border-secondary-200 shadow-sm flex items-center justify-center text-secondary-700 text-xs font-medium -ml-1">
                                                +{remainingCount}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <div className="ml-2">
                                          <button 
                                            onClick={() => router.push(`/workflows/${displayWorkflow.id}`)}
                                            className="text-primary-600 hover:text-primary-800 text-xs font-medium bg-primary-50 hover:bg-primary-100 rounded-md px-2 py-1 transition-colors duration-150"
                                          >
                                            + 共同編集者を追加
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
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
                                        ? 'bg-green-600 text-white hover:bg-green-700' 
                                        : 'bg-primary-600 text-white hover:bg-primary-700'
                                    } px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-colors duration-150`}
                                  >
                                    {displayWorkflow.isCompleted ? '完了済み' : '完了'}
                                  </button>
                                  <Link
                                    href={`/workflows/${displayWorkflow.id}`}
                                    className="bg-secondary-100 text-secondary-700 hover:bg-secondary-200 px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-colors duration-150"
                                  >
                                    詳細
                                  </Link>
                                  <button
                                    onClick={() => setActiveWorkflow(displayWorkflow.id)}
                                    className="bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-colors duration-150"
                                  >
                                    編集
                                  </button>
                                  <button
                                    onClick={() => handleDeleteWorkflow(displayWorkflow.id)}
                                    className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-colors duration-150"
                                  >
                                    削除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="bg-primary-50 rounded-lg p-6 inline-block">
                              <svg className="w-12 h-12 text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-primary-800 font-medium">
                                {searchTerm ? '検索条件に一致する業務フローはありません' : '保存された業務フローはありません'}
                              </p>
                              <p className="text-primary-600 text-sm mt-2">
                                新規作成ボタンをクリックして最初のワークフローを作成しましょう
                              </p>
                            </div>
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
