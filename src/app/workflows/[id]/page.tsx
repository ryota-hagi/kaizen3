'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// react-beautiful-dndをクライアントサイドのみでインポート
const DragDropContext = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.DragDropContext),
  { ssr: false }
)
const Droppable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Droppable),
  { ssr: false }
)
const Draggable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Draggable),
  { ssr: false }
)

import { DashboardLayout } from '../../../components/layouts/DashboardLayout'
import { WorkflowEditor } from '../../../components/workflow/WorkflowEditor'
import { ChatInterface } from '../../../components/chat/ChatInterface'
import { CollaboratorsManager } from '../../../components/workflow/CollaboratorsManager'
import { WorkflowContext, WorkflowContextProvider } from '../../../contexts/WorkflowContext'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
  cost?: number
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
  createdBy?: string
  accessLevel?: string
  is_public?: boolean
}

export default function WorkflowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [relatedWorkflow, setRelatedWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [showComparison, setShowComparison] = useState(true)
  const [chatExpanded, setChatExpanded] = useState(true)
  const [companyName, setCompanyName] = useState('株式会社サンプル')
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  
  // 共同編集者リストを取得する関数
  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`/api/workflows/collaborators?workflowId=${workflowId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('Fetched collaborators:', data);
      setCollaborators(data);
    } catch (error) {
      console.error('共同編集者の取得エラー:', error);
    }
  };
  
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
  
  // 初期表示時に共同編集者リストを取得
  useEffect(() => {
    if (workflowId) {
      fetchCollaborators();
    }
  }, [workflowId]);
  
  useEffect(() => {
    // ローカルストレージからワークフローを取得
    const loadWorkflows = () => {
      const storedWorkflows = localStorage.getItem('workflows')
      if (storedWorkflows) {
        try {
          const parsedWorkflows = JSON.parse(storedWorkflows)
          // 日付文字列をDateオブジェクトに変換
          const workflowsWithDates = parsedWorkflows.map((wf: any) => ({
            ...wf,
            createdAt: new Date(wf.createdAt),
            updatedAt: new Date(wf.updatedAt),
            // ステップIDを再生成して一貫性を確保
            steps: Array.isArray(wf.steps) ? wf.steps.map((step: any, index: number) => ({
              ...step,
              // 新しいIDを生成（ページ遷移時に一貫性を確保するため）
              id: `step-${wf.id}-${index}-${Date.now()}`,
              position: index
            })) : []
          }))
          
          // 指定されたIDのワークフローを検索
          const foundWorkflow = workflowsWithDates.find((wf: Workflow) => wf.id === workflowId)
          
          if (foundWorkflow) {
            setWorkflow(foundWorkflow)
            
            // 関連するワークフローを検索（改善前/改善後）
            if (foundWorkflow.isImproved && foundWorkflow.originalId) {
              // 改善後のワークフローの場合、元のワークフローを検索
              const original = workflowsWithDates.find((wf: Workflow) => wf.id === foundWorkflow.originalId)
              if (original) {
                setRelatedWorkflow(original)
              }
            } else {
              // 元のワークフローの場合、改善後のワークフローを検索
              const improved = workflowsWithDates.find(
                (wf: Workflow) => wf.originalId === foundWorkflow.id && wf.isImproved
              )
              if (improved) {
                setRelatedWorkflow(improved)
              }
            }
          } else {
            // ワークフローが見つからない場合はダッシュボードにリダイレクト
            router.push('/')
          }
        } catch (error) {
          console.error('ワークフローの解析エラー:', error)
          router.push('/')
        }
      } else {
        // ワークフローがない場合はダッシュボードにリダイレクト
        router.push('/')
      }
      
      setLoading(false)
    }
    
    loadWorkflows()
  }, [workflowId, router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">読み込み中...</h1>
          <p className="text-secondary-600">業務フロー情報を取得しています</p>
        </div>
      </div>
    )
  }
  
  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">業務フローが見つかりません</h1>
          <p className="text-secondary-600">
            指定された業務フローは存在しないか、削除された可能性があります。
            <br />
            <button 
              onClick={() => router.push('/')}
              className="text-primary-600 hover:text-primary-700 underline mt-2"
            >
              ダッシュボードに戻る
            </button>
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <DashboardLayout companyName={companyName}>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* メインコンテンツ */}
        <div className={`flex-1 flex ${chatExpanded ? 'pr-96' : 'pr-16'} transition-all duration-300 ease-in-out`}>
          <div className="flex-1 overflow-auto p-8">
            <div className="mb-6">
              <button 
                onClick={() => router.push('/')}
                className="text-sm text-secondary-500 hover:text-secondary-700 mb-2 flex items-center"
              >
                <span>← ダッシュボードに戻る</span>
              </button>
              <h1 className="text-2xl font-bold text-secondary-900">{workflow.name}</h1>
              <p className="text-secondary-600">{workflow.description}</p>
            </div>
            
            {/* 共同編集者管理セクション */}
            <CollaboratorsManager
              workflowId={workflow.id}
              createdBy={workflow.createdBy || ''}
              accessLevel={workflow.accessLevel || 'user'}
              onAccessLevelChange={async (newLevel) => {
                try {
                  // ローカルストレージからワークフローを取得
                  const storedWorkflows = localStorage.getItem('workflows');
                  if (storedWorkflows) {
                    const parsedWorkflows = JSON.parse(storedWorkflows);
                    const index = parsedWorkflows.findIndex((wf: any) => wf.id === workflow.id);
                    if (index !== -1) {
                      parsedWorkflows[index].accessLevel = newLevel;
                      localStorage.setItem('workflows', JSON.stringify(parsedWorkflows));
                      
                      // 状態を更新
                      setWorkflow({
                        ...workflow,
                        accessLevel: newLevel
                      });
                      return true;
                    }
                  }
                  return false;
                } catch (error) {
                  console.error('アクセスレベル更新エラー:', error);
                  return false;
                }
              }}
              onAddCollaborator={async (userId, permissionType) => {
                try {
                  // APIを呼び出して共同編集者を追加
                  const response = await fetch('/api/workflows/collaborators', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      workflowId: workflow.id,
                      userId,
                      permissionType
                    }),
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    console.error('API response error:', errorData);
                    throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                  }
                  
                  const result = await response.json();
                  console.log('Added collaborator:', result);
                  
                  // 共同編集者リストを再取得
                  fetchCollaborators();
                  
                  return true;
                } catch (error) {
                  console.error('共同編集者追加エラー:', error);
                  alert(`共同編集者の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
                  return false;
                }
              }}
              onRemoveCollaborator={async (collaboratorId) => {
                try {
                  // APIを呼び出して共同編集者を削除
                  const response = await fetch(`/api/workflows/collaborators?id=${collaboratorId}`, {
                    method: 'DELETE',
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    console.error('API response error:', errorData);
                    throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                  }
                  
                  const result = await response.json();
                  console.log('Removed collaborator:', result);
                  
                  // 共同編集者リストを再取得
                  fetchCollaborators();
                  
                  return true;
                } catch (error) {
                  console.error('共同編集者削除エラー:', error);
                  alert(`共同編集者の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
                  return false;
                }
              }}
              collaborators={collaborators}
            />
            
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-secondary-900">
                  業務フロー詳細
                </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        // ワークフローの完了状態を切り替える
                        const storedWorkflows = localStorage.getItem('workflows');
                        if (storedWorkflows) {
                          try {
                            const parsedWorkflows = JSON.parse(storedWorkflows);
                            const index = parsedWorkflows.findIndex((wf: any) => wf.id === workflow.id);
                            if (index !== -1) {
                              const isCompleted = !parsedWorkflows[index].isCompleted;
                              parsedWorkflows[index].isCompleted = isCompleted;
                              parsedWorkflows[index].completedAt = isCompleted ? new Date() : undefined;
                              localStorage.setItem('workflows', JSON.stringify(parsedWorkflows));
                              
                              // 状態を更新
                              setWorkflow({
                                ...workflow,
                                isCompleted: isCompleted,
                                completedAt: isCompleted ? new Date() : undefined
                              });
                            }
                          } catch (error) {
                            console.error('ワークフローの更新エラー:', error);
                          }
                        }
                      }}
                      className={`btn ${
                        workflow.isCompleted 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {workflow.isCompleted ? '完了済み' : '完了'}
                    </button>
                    {relatedWorkflow && (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setShowComparison(!showComparison)}
                      >
                        {showComparison ? '比較を閉じる' : '改善前後を比較'}
                      </button>
                    )}
                    <button 
                      className="btn btn-primary"
                      onClick={() => router.push(`/?workflowId=${workflowId}`)}
                    >
                      編集する
                    </button>
                  </div>
              </div>
              
              {relatedWorkflow && showComparison ? (
                // 改善前後の比較表示
                <div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                    <h3 className="text-lg font-medium text-green-800 mb-2">改善効果</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* 元のワークフローと改善後のワークフローを判別 */}
                      {(() => {
                        const originalWorkflow = workflow.isImproved ? relatedWorkflow : workflow;
                        const improvedWorkflow = workflow.isImproved ? workflow : relatedWorkflow;
                        
                        // 総所要時間の計算
                        const originalTotalTime = originalWorkflow.steps.reduce(
                          (total, step) => total + step.timeRequired, 0
                        );
                        const improvedTotalTime = improvedWorkflow.steps.reduce(
                          (total, step) => total + step.timeRequired, 0
                        );
                        const timeSaved = originalTotalTime - improvedTotalTime;
                        const percentSaved = Math.round((timeSaved / originalTotalTime) * 100);
                        
                        // コストの計算
                        const originalTotalCost = originalWorkflow.steps.reduce(
                          (total, step) => total + (step.cost || 0), 0
                        );
                        const improvedTotalCost = improvedWorkflow.steps.reduce(
                          (total, step) => total + (step.cost || 0), 0
                        );
                        const costSaved = originalTotalCost - improvedTotalCost;
                        
                        return (
                          <>
                            <div>
                              <p className="text-sm text-green-600">元の所要時間</p>
                              <p className="text-xl font-bold text-green-800">{originalTotalTime}分</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-600">改善後の所要時間</p>
                              <p className="text-xl font-bold text-green-800">{improvedTotalTime}分</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-600">削減時間</p>
                              <p className="text-xl font-bold text-green-800">{timeSaved}分 ({percentSaved}%削減)</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-600">自動化ステップ</p>
                              <p className="text-xl font-bold text-green-800">
                                {improvedWorkflow.steps.filter(step => step.assignee === '自動化').length}ステップ
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-green-600">元のコスト</p>
                              <p className="text-xl font-bold text-green-800">{originalTotalCost.toLocaleString()}円</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-600">改善後のコスト</p>
                              <p className="text-xl font-bold text-green-800">{improvedTotalCost.toLocaleString()}円</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-green-600">コスト削減</p>
                              <p className="text-xl font-bold text-green-800">
                                {costSaved.toLocaleString()}円 
                                ({originalTotalCost > 0 ? Math.round((costSaved / originalTotalCost) * 100) : 0}%削減)
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-secondary-900 mb-2 pb-2 border-b border-secondary-200">
                        既存フロー
                      </h4>
                      <div className="space-y-4">
                        {(workflow.isImproved ? relatedWorkflow : workflow).steps.map((step, index) => (
                          <div key={`original-${step.id}`} className="p-4 border border-secondary-200 rounded-lg">
                            <h3 className="text-lg font-medium text-secondary-900">{step.title}</h3>
                            <p className="text-secondary-600 mt-1">{step.description}</p>
                            <div className="flex items-center mt-2 text-sm text-secondary-500">
                              <div className="mr-4">
                                <span className="font-medium">担当:</span> {step.assignee}
                              </div>
                              <div className="mr-4">
                                <span className="font-medium">所要時間:</span> {step.timeRequired}分
                              </div>
                              <div>
                                <span className="font-medium">コスト:</span> {step.cost !== undefined ? `${step.cost.toLocaleString()}円` : '未設定'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium text-secondary-900 mb-2 pb-2 border-b border-secondary-200">
                        改善後フロー
                      </h4>
                      <div className="space-y-4">
                        {(workflow.isImproved ? workflow : relatedWorkflow).steps.map((step, index) => (
                          <div key={`improved-${step.id}`} className="p-4 border border-secondary-200 rounded-lg">
                            <h3 className="text-lg font-medium text-secondary-900">{step.title}</h3>
                            <p className="text-secondary-600 mt-1">{step.description}</p>
                            <div className="flex items-center mt-2 text-sm text-secondary-500">
                              <div className="mr-4">
                                <span className="font-medium">担当:</span> {step.assignee}
                              </div>
                              <div className="mr-4">
                                <span className="font-medium">所要時間:</span> {step.timeRequired}分
                              </div>
                              <div>
                                <span className="font-medium">コスト:</span> {step.cost !== undefined ? `${step.cost.toLocaleString()}円` : '未設定'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // 単一ワークフロー表示
                <div className="space-y-4">
                  {/* 通常の表示に変更し、ドラッグアンドドロップ機能を無効化 */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300" style={{ minHeight: '100px' }}>
                    {workflow.steps.map((step, index) => (
                      <div key={`step-${index}`} className="p-4 border border-secondary-200 rounded-lg bg-white relative">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-secondary-900">{step.title}</h3>
                            <p className="text-secondary-600 mt-1">{step.description}</p>
                            <div className="flex items-center mt-2 text-sm text-secondary-500">
                              <div className="mr-4">
                                <span className="font-medium">担当:</span> {step.assignee}
                              </div>
                              <div className="mr-4">
                                <span className="font-medium">所要時間:</span> {step.timeRequired}分
                              </div>
                              <div>
                                <span className="font-medium">コスト:</span> {step.cost !== undefined ? `${step.cost.toLocaleString()}円` : '未設定'}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            {index > 0 && (
                              <button 
                                onClick={() => {
                                  // 上に移動
                                  const newSteps = [...workflow.steps];
                                  const temp = newSteps[index];
                                  newSteps[index] = newSteps[index - 1];
                                  newSteps[index - 1] = temp;
                                  
                                  // 位置情報を更新
                                  const updatedSteps = newSteps.map((item, idx) => ({
                                    ...item,
                                    position: idx
                                  }));
                                  
                                  // ローカルストレージを更新
                                  const storedWorkflows = localStorage.getItem('workflows');
                                  if (storedWorkflows) {
                                    try {
                                      const parsedWorkflows = JSON.parse(storedWorkflows);
                                      const wfIndex = parsedWorkflows.findIndex((wf: any) => wf.id === workflow.id);
                                      if (wfIndex !== -1) {
                                        parsedWorkflows[wfIndex].steps = updatedSteps;
                                        localStorage.setItem('workflows', JSON.stringify(parsedWorkflows));
                                      }
                                    } catch (error) {
                                      console.error('ワークフローの更新エラー:', error);
                                    }
                                  }
                                  
                                  // 状態を更新
                                  setWorkflow({
                                    ...workflow,
                                    steps: updatedSteps
                                  });
                                }}
                                className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                                title="上に移動"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 19V5M5 12l7-7 7 7"/>
                                </svg>
                              </button>
                            )}
                            {index < workflow.steps.length - 1 && (
                              <button 
                                onClick={() => {
                                  // 下に移動
                                  const newSteps = [...workflow.steps];
                                  const temp = newSteps[index];
                                  newSteps[index] = newSteps[index + 1];
                                  newSteps[index + 1] = temp;
                                  
                                  // 位置情報を更新
                                  const updatedSteps = newSteps.map((item, idx) => ({
                                    ...item,
                                    position: idx
                                  }));
                                  
                                  // ローカルストレージを更新
                                  const storedWorkflows = localStorage.getItem('workflows');
                                  if (storedWorkflows) {
                                    try {
                                      const parsedWorkflows = JSON.parse(storedWorkflows);
                                      const wfIndex = parsedWorkflows.findIndex((wf: any) => wf.id === workflow.id);
                                      if (wfIndex !== -1) {
                                        parsedWorkflows[wfIndex].steps = updatedSteps;
                                        localStorage.setItem('workflows', JSON.stringify(parsedWorkflows));
                                      }
                                    } catch (error) {
                                      console.error('ワークフローの更新エラー:', error);
                                    }
                                  }
                                  
                                  // 状態を更新
                                  setWorkflow({
                                    ...workflow,
                                    steps: updatedSteps
                                  });
                                }}
                                className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                                title="下に移動"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 5v14M5 12l7 7 7-7"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* チャットインターフェース */}
        <div 
          className={`fixed right-0 top-0 h-full bg-white border-l border-secondary-200 transition-all duration-300 ease-in-out ${
            chatExpanded ? 'w-96' : 'w-16'
          }`}
        >
          <button
            className="absolute top-4 left-4 text-secondary-500 hover:text-secondary-700"
            onClick={() => setChatExpanded(!chatExpanded)}
          >
            {chatExpanded ? '>' : '<'}
          </button>
          
          {chatExpanded && (
            <div className="h-full pt-14">
              <WorkflowContextProvider>
              <ChatInterface 
                companyInfo={companyInfo}
                employees={employees}
                workflowContext={{
                  id: workflow.id,
                  name: workflow.name,
                  description: workflow.description,
                  steps: workflow.steps,
                  isImproved: workflow.isImproved,
                  originalId: workflow.originalId,
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
                }}
              />
              </WorkflowContextProvider>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
