'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  stepCount: number
  steps: WorkflowStep[]
  isImproved?: boolean
  originalId?: string
  isCompleted?: boolean
  completedAt?: Date
}

export default function Home() {
  // チャットの開閉状態を管理
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [companyName, setCompanyName] = useState('株式会社サンプル')
  const [showCompleted, setShowCompleted] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const router = useRouter()
  const { getUserById } = useUser()
  
  // 会社情報と従業員情報を取得
  useEffect(() => {
    // ローカルストレージから会社情報を取得
    const savedCompanyInfo = localStorage.getItem('kaizen_company_info')
    console.log('Raw Company Info from localStorage:', savedCompanyInfo)
    
    if (savedCompanyInfo) {
      try {
        const parsedCompanyInfo = JSON.parse(savedCompanyInfo)
        console.log('Parsed Company Info Type:', typeof parsedCompanyInfo)
        console.log('Parsed Company Info Keys:', Object.keys(parsedCompanyInfo))
        console.log('Parsed Company Info Values:', JSON.stringify(parsedCompanyInfo, null, 2))
        
        // 会社情報の検証
        if (typeof parsedCompanyInfo !== 'object' || parsedCompanyInfo === null) {
          throw new Error('Company info is not an object')
        }
        
        setCompanyInfo(parsedCompanyInfo)
        setCompanyName(parsedCompanyInfo.name || '株式会社サンプル')
        console.log('Loaded Company Info:', parsedCompanyInfo)
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
        console.log('Using Default Company Info:', defaultCompanyInfo)
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
      console.log('No Company Info Found. Using Default:', defaultCompanyInfo)
    }
    
    // ローカルストレージから従業員情報を取得
    const savedEmployees = localStorage.getItem('kaizen_employees')
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees)
        setEmployees(parsedEmployees)
        console.log('Loaded Employees:', parsedEmployees)
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
        console.log('Using Default Employees:', defaultEmployees)
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
      console.log('No Employees Found. Using Default:', defaultEmployees)
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

  // ワークフローを取得（実際のアプリではAPIから取得）
  const loadWorkflows = () => {
    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows');
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows);
        // 日付文字列をDateオブジェクトに変換
        const workflowsWithDates = parsedWorkflows.map((wf: any) => ({
          ...wf,
          createdAt: new Date(wf.createdAt),
          updatedAt: new Date(wf.updatedAt)
        }));
        
        // 最新順にソート
        const sortedWorkflows = workflowsWithDates
          .sort((a: Workflow, b: Workflow) => b.updatedAt.getTime() - a.updatedAt.getTime());
          
        setWorkflows(sortedWorkflows);
      } catch (error) {
        console.error('ワークフローの解析エラー:', error);
      }
    }
  };

  // 初回レンダリング時とアクティブワークフローが変更されたときにワークフローリストを更新
  useEffect(() => {
    loadWorkflows();
  }, [activeWorkflow]);

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
  const handleDeleteWorkflow = (id: string) => {
    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows');
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows);
        // 指定されたIDのワークフローを削除
        const updatedWorkflows = parsedWorkflows.filter((wf: any) => wf.id !== id);
        // ローカルストレージに保存
        localStorage.setItem('workflows', JSON.stringify(updatedWorkflows));
        
        // 状態を更新
        setWorkflows(workflows.filter(wf => wf.id !== id));
      } catch (error) {
        console.error('ワークフローの削除エラー:', error);
      }
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

  return (
    <DashboardLayout companyName={companyName}>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* メインコンテンツ */}
        <div className={`flex-1 flex ${isChatOpen ? 'pr-96' : ''} transition-all duration-300 ease-in-out`}>
          <div className="flex-1 overflow-auto p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-secondary-900">ダッシュボード</h1>
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
                
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-secondary-200">
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
                      {filteredWorkflows.length > 0 ? (
                        // ワークフローをグループ化して表示
                        (() => {
                          // 改善前のワークフローと改善後のワークフローをマッピング
                          const workflowGroups = new Map();
                          
                          // 改善後のワークフローを元のワークフローIDでグループ化
                          filteredWorkflows.forEach(workflow => {
                            if (workflow.isImproved && workflow.originalId) {
                              if (!workflowGroups.has(workflow.originalId)) {
                                workflowGroups.set(workflow.originalId, {
                                  original: null,
                                  improved: workflow
                                });
                              } else {
                                workflowGroups.get(workflow.originalId).improved = workflow;
                              }
                            }
                          });
                          
                          // 元のワークフローを追加
                          filteredWorkflows.forEach(workflow => {
                            if (!workflow.isImproved) {
                              if (!workflowGroups.has(workflow.id)) {
                                workflowGroups.set(workflow.id, {
                                  original: workflow,
                                  improved: null
                                });
                              } else {
                                workflowGroups.get(workflow.id).original = workflow;
                              }
                            }
                          });
                          
                          // グループ化されたワークフローを表示
                          return Array.from(workflowGroups.entries()).map(([groupId, group]) => {
                            const { original, improved } = group;
                            
                            // 表示するワークフロー（元のワークフローを優先）
                            const displayWorkflow = original || improved;
                            if (!displayWorkflow) return null;
                            
                            return (
                              <tr key={groupId} className="hover:bg-secondary-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div 
                                    className="text-sm font-medium text-secondary-900 cursor-pointer hover:text-primary-600"
                                    onClick={() => setActiveWorkflow(displayWorkflow.id)}
                                  >
                                    {displayWorkflow.name}
                                    {improved && (
                                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                        改善案あり
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-secondary-500 line-clamp-2">{displayWorkflow.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-secondary-500">{displayWorkflow.steps?.length || 0}ステップ</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-secondary-500">
                                    {displayWorkflow.updatedAt.toLocaleDateString('ja-JP')}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {displayWorkflow.createdBy && getUserById ? getUserById(displayWorkflow.createdBy) ? (
                                    <div className="flex items-center">
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
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-secondary-500">未設定</div>
                                  ) : (
                                    <div className="text-sm text-secondary-500">未設定</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => {
                                      // ワークフローの完了状態を切り替える
                                      const storedWorkflows = localStorage.getItem('workflows');
                                      if (storedWorkflows) {
                                        try {
                                          const parsedWorkflows = JSON.parse(storedWorkflows);
                                          const index = parsedWorkflows.findIndex((wf: any) => wf.id === displayWorkflow.id);
                                          if (index !== -1) {
                                            const isCompleted = !parsedWorkflows[index].isCompleted;
                                            parsedWorkflows[index].isCompleted = isCompleted;
                                            parsedWorkflows[index].completedAt = isCompleted ? new Date() : undefined;
                                            localStorage.setItem('workflows', JSON.stringify(parsedWorkflows));
                                            
                                            // 状態を更新
                                            loadWorkflows();
                                          }
                                        } catch (error) {
                                          console.error('ワークフローの更新エラー:', error);
                                        }
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
                            );
                          });
                        })()
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
            
            console.log('Current Workflow:', currentWorkflow);
            console.log('Related Workflow:', relatedWorkflow);
            
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
