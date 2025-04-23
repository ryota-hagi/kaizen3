'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '../../components/layouts/DashboardLayout'

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
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [companyName, setCompanyName] = useState('株式会社サンプル')
  const [showCompleted, setShowCompleted] = useState(false)
  const router = useRouter()
  
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
  
  // ワークフローを取得（実際のアプリではAPIから取得）
  const loadWorkflows = () => {
    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows')
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows)
        // 日付文字列をDateオブジェクトに変換
        const workflowsWithDates = parsedWorkflows.map((wf: any) => ({
          ...wf,
          createdAt: new Date(wf.createdAt),
          updatedAt: new Date(wf.updatedAt)
        }))
        
        // 最新順にソート
        const sortedWorkflows = workflowsWithDates
          .sort((a: Workflow, b: Workflow) => b.updatedAt.getTime() - a.updatedAt.getTime())
          
        setWorkflows(sortedWorkflows)
      } catch (error) {
        console.error('ワークフローの解析エラー:', error)
      }
    }
  }

  // 初回レンダリング時にワークフローリストを更新
  useEffect(() => {
    loadWorkflows()
  }, [])

  // ローカルストレージの変更を監視
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workflows') {
        loadWorkflows()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

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
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  フロー名
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  説明
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  ステップ数
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  最終更新日
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
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
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-500">{displayWorkflow.steps?.length || 0}ステップ</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-500">
                          {displayWorkflow.updatedAt.toLocaleDateString('ja-JP')}
                        </div>
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
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-secondary-500">
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
