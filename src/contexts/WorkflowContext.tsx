'use client'

import React, { createContext, useState, useEffect, ReactNode } from 'react'

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
  steps: WorkflowStep[]
  createdAt: Date
  updatedAt: Date
  isImproved?: boolean
  originalId?: string
  isCompleted?: boolean
  completedAt?: Date
}

interface WorkflowContextType {
  currentWorkflow: Workflow | null
  originalWorkflow: Workflow | null
  isImproved: boolean
  showComparison: boolean
  setCurrentWorkflow: (workflow: Workflow | null) => void
  updateWorkflow: (updates: Partial<Workflow>) => void
  improveWorkflow: () => void
  saveWorkflow: () => void
  addStep: (step: Omit<WorkflowStep, 'id' | 'position'>) => void
  deleteStep: (stepId: string) => void
  editStep: (stepId: string, updates: Partial<WorkflowStep>) => void
  setShowComparison: (show: boolean) => void
  toggleWorkflowCompletion: (completed: boolean) => void
}

export const WorkflowContext = createContext<WorkflowContextType>({
  currentWorkflow: null,
  originalWorkflow: null,
  isImproved: false,
  showComparison: false,
  setCurrentWorkflow: () => {},
  updateWorkflow: () => {},
  improveWorkflow: () => {},
  saveWorkflow: () => {},
  addStep: () => {},
  deleteStep: () => {},
  editStep: () => {},
  setShowComparison: () => {},
  toggleWorkflowCompletion: () => {}
})

interface WorkflowContextProviderProps {
  children: ReactNode
  initialWorkflowId?: string
}

export const WorkflowContextProvider: React.FC<WorkflowContextProviderProps> = ({ 
  children, 
  initialWorkflowId 
}) => {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null)
  const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(null)
  const [isImproved, setIsImproved] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    if (initialWorkflowId) {
      loadWorkflow(initialWorkflowId)
    }
  }, [initialWorkflowId])

  const loadWorkflow = (workflowId: string) => {
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
        
        // 指定されたIDのワークフローを検索
        const foundWorkflow = workflowsWithDates.find((wf: Workflow) => wf.id === workflowId)
        
        if (foundWorkflow) {
          setCurrentWorkflow(foundWorkflow)
          setIsImproved(foundWorkflow.isImproved || false)
          
          // 改善後フローの場合、元のフローも取得
          if (foundWorkflow.isImproved && foundWorkflow.originalId) {
            const originalWorkflow = workflowsWithDates.find(
              (wf: Workflow) => wf.id === foundWorkflow.originalId
            )
            if (originalWorkflow) {
              setOriginalWorkflow(originalWorkflow)
            }
          } else {
            setOriginalWorkflow(foundWorkflow)
          }
        } else {
          // ワークフローが見つからない場合はサンプルデータを使用
          loadSampleWorkflow(workflowId)
        }
      } catch (error) {
        console.error('ワークフローの解析エラー:', error)
        loadSampleWorkflow(workflowId)
      }
    } else {
      // ストレージにデータがない場合はサンプルデータを使用
      loadSampleWorkflow(workflowId)
    }
  }

  const loadSampleWorkflow = (workflowId: string) => {
    const sampleSteps: WorkflowStep[] = [
      {
        id: '1',
        title: '受注入力',
        description: '顧客からの注文を受け付け、システムに入力する',
        assignee: '営業担当',
        timeRequired: 15,
        position: 0
      },
      {
        id: '2',
        title: '在庫確認',
        description: '注文された商品の在庫を確認する',
        assignee: '倉庫担当',
        timeRequired: 10,
        position: 1
      },
      {
        id: '3',
        title: '出荷準備',
        description: '商品を梱包し、出荷の準備をする',
        assignee: '倉庫担当',
        timeRequired: 20,
        position: 2
      },
      {
        id: '4',
        title: '配送手配',
        description: '配送業者に連絡し、集荷を依頼する',
        assignee: '物流担当',
        timeRequired: 15,
        position: 3
      },
      {
        id: '5',
        title: '請求書発行',
        description: '顧客に請求書を発行する',
        assignee: '経理担当',
        timeRequired: 10,
        position: 4
      }
    ]

    const sampleWorkflow: Workflow = {
      id: workflowId === 'new' ? 'new' : workflowId,
      name: '受注処理フロー',
      description: '顧客からの注文を受け付けてから出荷までの業務フロー',
      steps: sampleSteps,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setCurrentWorkflow(sampleWorkflow)
    setOriginalWorkflow(sampleWorkflow)
    setIsImproved(false)
  }

  const updateWorkflow = (updates: Partial<Workflow>) => {
    if (!currentWorkflow) return

    setCurrentWorkflow({
      ...currentWorkflow,
      ...updates,
      updatedAt: new Date()
    })
  }

  const improveWorkflow = () => {
    if (!currentWorkflow) return

    // 実際のアプリケーションではClaudeのAPIを呼び出して改善案を取得する
    // ここではサンプルの改善案を表示
    const improvedSteps: WorkflowStep[] = [
      {
        id: '1',
        title: 'オンライン受注システム',
        description: '顧客がオンラインで直接注文を入力するシステムを導入',
        assignee: '自動化',
        timeRequired: 5,
        position: 0
      },
      {
        id: '2',
        title: '自動在庫確認',
        description: '在庫管理システムと連携して自動的に在庫を確認',
        assignee: '自動化',
        timeRequired: 1,
        position: 1
      },
      {
        id: '3',
        title: '出荷準備',
        description: 'ピッキングリストを自動生成し、効率的に梱包',
        assignee: '倉庫担当',
        timeRequired: 15,
        position: 2
      },
      {
        id: '4',
        title: '配送自動手配',
        description: '配送業者のAPIと連携して自動的に集荷を依頼',
        assignee: '自動化',
        timeRequired: 2,
        position: 3
      },
      {
        id: '5',
        title: '自動請求書発行',
        description: '出荷完了時に自動的に請求書を生成してメール送信',
        assignee: '自動化',
        timeRequired: 1,
        position: 4
      }
    ]

    // 改善後のワークフローを作成
    const newImprovedWorkflow: Workflow = {
      id: `improved-${Date.now()}`,
      name: `${currentWorkflow.name}（改善後）`,
      description: `${currentWorkflow.description} - AIによる改善案`,
      steps: improvedSteps,
      createdAt: new Date(),
      updatedAt: new Date(),
      isImproved: true,
      originalId: currentWorkflow.id
    }

    setCurrentWorkflow(newImprovedWorkflow)
    setIsImproved(true)
    setShowComparison(true)
  }

  const saveWorkflow = () => {
    if (!currentWorkflow) return

    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows')
    let workflows: Workflow[] = []
    
    if (storedWorkflows) {
      try {
        workflows = JSON.parse(storedWorkflows)
      } catch (error) {
        console.error('ワークフローの解析エラー:', error)
      }
    }

    // 新規作成の場合
    if (currentWorkflow.id === 'new') {
      const newWorkflow = {
        ...currentWorkflow,
        id: Date.now().toString()
      }
      workflows.push(newWorkflow)
      setCurrentWorkflow(newWorkflow)
    } else {
      // 既存ワークフローの更新
      const index = workflows.findIndex(wf => wf.id === currentWorkflow.id)
      if (index !== -1) {
        workflows[index] = currentWorkflow
      } else {
        workflows.push(currentWorkflow)
      }
    }

    // ローカルストレージに保存
    localStorage.setItem('workflows', JSON.stringify(workflows))

    // 保存完了メッセージ
    alert('業務フローを保存しました')
  }

  const addStep = (step: Omit<WorkflowStep, 'id' | 'position'>) => {
    if (!currentWorkflow) return

    const newStep: WorkflowStep = {
      ...step,
      id: Date.now().toString(),
      position: currentWorkflow.steps.length
    }

    setCurrentWorkflow({
      ...currentWorkflow,
      steps: [...currentWorkflow.steps, newStep],
      updatedAt: new Date()
    })
  }

  const deleteStep = (stepId: string) => {
    if (!currentWorkflow) return

    setCurrentWorkflow({
      ...currentWorkflow,
      steps: currentWorkflow.steps.filter(step => step.id !== stepId),
      updatedAt: new Date()
    })
  }

  const editStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!currentWorkflow) return

    setCurrentWorkflow({
      ...currentWorkflow,
      steps: currentWorkflow.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      ),
      updatedAt: new Date()
    })
  }

  // ワークフローの完了状態を切り替える
  const toggleWorkflowCompletion = (completed: boolean) => {
    if (!currentWorkflow) return

    const updates: Partial<Workflow> = {
      isCompleted: completed,
      completedAt: completed ? new Date() : undefined
    }

    setCurrentWorkflow({
      ...currentWorkflow,
      ...updates
    })

    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows')
    let workflows: Workflow[] = []
    
    if (storedWorkflows) {
      try {
        workflows = JSON.parse(storedWorkflows)
      } catch (error) {
        console.error('ワークフローの解析エラー:', error)
      }
    }

    // ワークフローの更新
    const index = workflows.findIndex(wf => wf.id === currentWorkflow.id)
    if (index !== -1) {
      workflows[index] = {
        ...workflows[index],
        ...updates
      }
    }

    // ローカルストレージに保存
    localStorage.setItem('workflows', JSON.stringify(workflows))
  }

  return (
    <WorkflowContext.Provider
      value={{
        currentWorkflow,
        originalWorkflow,
        isImproved,
        showComparison,
        setCurrentWorkflow,
        updateWorkflow,
        improveWorkflow,
        saveWorkflow,
        addStep,
        deleteStep,
        editStep,
        setShowComparison,
        toggleWorkflowCompletion
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}
