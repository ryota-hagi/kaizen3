'use client'

import { useState, useEffect } from 'react'
import { Workflow } from '../../utils/api'
import { WorkflowStep, generateSampleWorkflow, parseStepsFromResponse } from './WorkflowEditorHelpers'
import { useUser } from '../../contexts/UserContext'

/**
 * ワークフローデータを読み込むためのカスタムフック
 * @param workflowId ワークフローID
 * @returns ワークフロー関連の状態と操作関数
 */
export const useWorkflowData = (workflowId: string) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [isImproved, setIsImproved] = useState(false)
  const [originalSteps, setOriginalSteps] = useState<WorkflowStep[]>([])
  const [improvedSteps, setImprovedSteps] = useState<WorkflowStep[]>([])
  const [previousImprovedSteps, setPreviousImprovedSteps] = useState<WorkflowStep[]>([])
  const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(null)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [improvedWorkflow, setImprovedWorkflow] = useState<Workflow | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  // ワークフローデータの読み込み
  useEffect(() => {
    // 新規作成の場合
    if (workflowId === 'new') {
      setWorkflow({
        id: 'new',
        name: '新規業務フロー',
        description: '',
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      setWorkflowName('新規業務フロー')
      setWorkflowDescription('')
      setSteps([])
      return
    }

    // ローカルストレージからワークフローを取得
    const storedWorkflows = localStorage.getItem('workflows')
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows)
        // 日付文字列をDateオブジェクトに変換し、ステップIDを再生成
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
          setWorkflowName(foundWorkflow.name)
          setWorkflowDescription(foundWorkflow.description)
          setSteps(foundWorkflow.steps || [])
          setIsImproved(foundWorkflow.isImproved || false)
          setIsCompleted(foundWorkflow.isCompleted || false)
          
          // 改善後フローの場合、元のフローも取得
          if (foundWorkflow.isImproved && foundWorkflow.originalId) {
            const originalWorkflow = workflowsWithDates.find((wf: Workflow) => wf.id === foundWorkflow.originalId)
            if (originalWorkflow) {
              setOriginalWorkflow(originalWorkflow)
              setOriginalSteps(originalWorkflow.steps || [])
            }
            // 改善後フローの場合は、自身のステップを改善後ステップとして設定
            setImprovedSteps(foundWorkflow.steps || [])
          } else {
            setOriginalSteps(foundWorkflow.steps || [])
            
            // 改善前フローの場合、対応する改善後フローがあるか確認
            const improvedVersion = workflowsWithDates.find(
              (wf: Workflow) => wf.originalId === foundWorkflow.id && wf.isImproved
            )
            if (improvedVersion) {
              setImprovedWorkflow(improvedVersion)
              setImprovedSteps(improvedVersion.steps || [])
              // 改善後フローが存在する場合は、改善済みフラグを設定
              setIsImproved(true)
              // 改善後フローが存在する場合は、比較モードを表示
              setShowComparison(true)
            }
          }
        } else {
          // ワークフローが見つからない場合はサンプルデータを使用
          loadSampleWorkflow()
        }
      } catch (error) {
        console.error('ワークフローの解析エラー:', error)
        loadSampleWorkflow()
      }
    } else {
      // ストレージにデータがない場合はサンプルデータを使用
      loadSampleWorkflow()
    }
  }, [workflowId])

  // サンプルワークフローの読み込み
  const loadSampleWorkflow = () => {
    const sampleWorkflow = generateSampleWorkflow(workflowId)
    
    setWorkflow(sampleWorkflow)
    setWorkflowName(sampleWorkflow.name)
    setWorkflowDescription(sampleWorkflow.description)
    setSteps(sampleWorkflow.steps)
    setOriginalSteps(sampleWorkflow.steps)
  }

  // ワークフローの更新
  const updateWorkflowData = (updates: Partial<Workflow>) => {
    if (!workflow) return

    setWorkflow({
      ...workflow,
      ...updates,
      updatedAt: new Date()
    })
  }

  // ステップの追加
  const addStep = (step: Omit<WorkflowStep, 'id' | 'position'>) => {
    if (!workflow) return

    const newStep: WorkflowStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: steps.length
    }

    const updatedSteps = [...steps, newStep]
    
    setSteps(updatedSteps)
    
    // 元のステップも更新（比較画面に反映させるため）
    if (!workflow?.isImproved) {
      setOriginalSteps(updatedSteps)
    }
    
    // ワークフローの更新日時を更新
    if (workflow) {
      const updatedWorkflow = {
        ...workflow,
        steps: updatedSteps,
        updatedAt: new Date()
      }
      setWorkflow(updatedWorkflow)
    }
  }

  // ステップの編集
  const editStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!workflow) return

    const updatedSteps = steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    
    setSteps(updatedSteps)
    
    // 元のステップも更新（比較画面に反映させるため）
    if (!workflow?.isImproved) {
      setOriginalSteps(updatedSteps)
    }
    
    // ワークフローの更新日時を更新
    if (workflow) {
      const updatedWorkflow = {
        ...workflow,
        steps: updatedSteps,
        updatedAt: new Date()
      }
      setWorkflow(updatedWorkflow)
    }
  }

  // ステップの削除
  const deleteStep = (stepId: string) => {
    if (!workflow) return

    const filteredSteps = steps.filter(step => step.id !== stepId)
    
    // 位置情報を更新（削除後に全ステップの位置を再計算）
    const updatedSteps = filteredSteps.map((item, index) => ({
      ...item,
      position: index
    }))
    
    setSteps(updatedSteps)
    
    // 元のステップも更新（比較画面に反映させるため）
    if (!workflow?.isImproved) {
      setOriginalSteps(updatedSteps)
    }
    
    // ワークフローの更新日時を更新
    if (workflow) {
      const updatedWorkflow = {
        ...workflow,
        steps: updatedSteps,
        updatedAt: new Date()
      }
      setWorkflow(updatedWorkflow)
    }
  }

  // ドラッグ＆ドロップ後の並び替え
  const reorderSteps = (sourceIndex: number, destinationIndex: number) => {
    if (!workflow) return

    const items = Array.from(steps)
    const [reorderedItem] = items.splice(sourceIndex, 1)
    items.splice(destinationIndex, 0, reorderedItem)

    // 位置情報を更新
    const updatedItems = items.map((item, index) => ({
      ...item,
      id: String(item.id), // IDを確実に文字列に変換
      position: index
    }))

    setSteps(updatedItems)
    
    // 元のステップも更新（比較画面に反映させるため）
    if (!workflow?.isImproved) {
      setOriginalSteps(updatedItems)
    }
    
    // ワークフローの更新日時を更新
    if (workflow) {
      const updatedWorkflow = {
        ...workflow,
        steps: updatedItems,
        updatedAt: new Date()
      }
      setWorkflow(updatedWorkflow)
    }
  }

  return {
    workflow,
    steps,
    isImproved,
    originalSteps,
    improvedSteps,
    previousImprovedSteps,
    originalWorkflow,
    workflowName,
    workflowDescription,
    showComparison,
    improvedWorkflow,
    isCompleted,
    setWorkflow,
    setSteps,
    setIsImproved,
    setOriginalSteps,
    setImprovedSteps,
    setPreviousImprovedSteps,
    setOriginalWorkflow,
    setWorkflowName,
    setWorkflowDescription,
    setShowComparison,
    setImprovedWorkflow,
    setIsCompleted,
    updateWorkflowData,
    addStep,
    editStep,
    deleteStep,
    reorderSteps
  }
}

/**
 * Claude APIを使用してワークフローを改善するためのカスタムフック
 * @param workflow 現在のワークフロー
 * @param originalSteps 元のステップ配列
 * @param improvedSteps 改善後のステップ配列
 * @param setImprovedSteps 改善後のステップを設定する関数
 * @param setPreviousImprovedSteps 以前の改善後のステップを設定する関数
 * @param setIsImproved 改善フラグを設定する関数
 * @param setShowComparison 比較表示フラグを設定する関数
 * @param setImprovedWorkflow 改善後のワークフローを設定する関数
 * @param workflowName ワークフロー名
 * @param workflowDescription ワークフローの説明
 * @returns 改善関連の状態と操作関数
 */
export const useWorkflowImprovement = (
  workflow: Workflow | null,
  originalSteps: WorkflowStep[],
  improvedSteps: WorkflowStep[],
  setImprovedSteps: (steps: WorkflowStep[]) => void,
  setPreviousImprovedSteps: (steps: WorkflowStep[]) => void,
  setIsImproved: (improved: boolean) => void,
  setShowComparison: (show: boolean) => void,
  setImprovedWorkflow: (workflow: Workflow | null) => void,
  workflowName: string,
  workflowDescription: string,
  improvedWorkflow: Workflow | null = null
) => {
  // UserContextからユーザー情報を取得
  const { currentUser } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [previousSteps, setPreviousSteps] = useState<WorkflowStep[]>([])

  // ワークフローの改善
  const improveWorkflow = async (customPromptText?: string) => {
    console.log("improveWorkflow が呼び出されました")
    if (!workflow) {
      console.log("workflow が null です")
      return
    }
    
    // ローディング状態を設定
    setIsLoading(true)
    console.log("ローディング状態を設定しました: true")
    
    // 現在の改善後フローがある場合は履歴に保存
    if (improvedSteps.length > 0) {
      setPreviousSteps(improvedSteps)
      setPreviousImprovedSteps(improvedSteps)
      console.log("既存の改善後フローを履歴に保存しました")
    }

    try {
      // Claudeに送信するプロンプトを作成
      const prompt = customPromptText || `
以下の業務フローを分析して、自動化や効率化が可能な改善案を提案してください。
各ステップについて、自動化できるものは担当を「自動化」に変更し、所要時間も短縮してください。
改善案は元のステップ数を維持しつつ、各ステップの内容、担当者、所要時間を最適化してください。

業務フロー名: ${workflow.name}
説明: ${workflow.description}

現在のステップ:
${workflow.steps
  .map(
    (step, index) => `${index + 1}. ${step.title}
   - 説明: ${step.description}
   - 担当: ${step.assignee}
   - 所要時間: ${step.timeRequired}分
   ${(step as WorkflowStep).tools ? `- ツール/設備: ${(step as WorkflowStep).tools}` : ''}`
  )
  .join('\n')}

回答は必ず以下のフォーマットで各ステップごとに提供してください：
<工程名>ステップのタイトル</工程名>
<概要>ステップの説明</概要>
<担当者>担当者または「自動化」</担当者>
<所要時間>分数（数字のみ）</所要時間>
<ツール>使用するツールや設備（メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど）</ツール>
<コスト>コスト削減額または「なし」</コスト>

各タグは必ず含めてください。特に<ツール>タグは重要です。自動化の場合は「自動化システム」などの適切なツール名を指定してください。
`;

      try {
        // 会社情報を取得
        const storedCompanyInfo = localStorage.getItem('kaizen_company_info')
        let companyInfo = null
        if (storedCompanyInfo) {
          try {
            companyInfo = JSON.parse(storedCompanyInfo)
          } catch (error) {
            console.error('会社情報の解析エラー:', error)
          }
        }

        // 従業員情報を取得
        const storedEmployees = localStorage.getItem('kaizen_employees')
        let employees = []
        if (storedEmployees) {
          try {
            employees = JSON.parse(storedEmployees)
          } catch (error) {
            console.error('従業員情報の解析エラー:', error)
          }
        }

        // 実際にClaudeAPIを呼び出す
        console.log('ClaudeAPIを呼び出します')
        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: prompt,
            companyInfo: companyInfo,
            employees: employees,
            workflowContext: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              steps: workflow.steps,
              isImproved: workflow.isImproved || false,
              // 再提案の場合は、現在の改善後ステップを使用
              relatedWorkflow: {
                id: improvedWorkflow ? improvedWorkflow.id : `improved-${workflow?.id}-${Date.now()}`,
                name: `${workflowName}（改善後）`,
                description: `${workflowDescription} - AIによる改善案`,
                steps: improvedSteps.length > 0 ? improvedSteps : [],
                createdAt: improvedWorkflow ? improvedWorkflow.createdAt : new Date(),
                updatedAt: new Date(),
                isImproved: true,
                originalId: workflow.id
              }
            }
          }),
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        console.log('Claude API Response:', data)

        // レスポンスからステップ情報を抽出
        const responseText = data.response
        console.log('Response Text:', responseText)

        // レスポンステキストからステップ情報を抽出
        const steps = parseStepsFromResponse(responseText, originalSteps)
        console.log("抽出されたステップ:", steps)

        // 改善後のワークフローを作成
        const newImprovedWorkflow: Workflow = {
          id: improvedWorkflow ? improvedWorkflow.id : `improved-${workflow?.id}-${Date.now()}`,
          name: `${workflowName}（改善後）`,
          description: `${workflowDescription} - AIによる改善案`,
          steps: steps,
          createdAt: improvedWorkflow ? improvedWorkflow.createdAt : new Date(),
          updatedAt: new Date(),
          isImproved: true,
          originalId: workflow?.id,
          createdBy: currentUser?.id // 現在のユーザーIDを作成者として設定
        }

        setImprovedWorkflow(newImprovedWorkflow)
        setImprovedSteps(steps)
        setIsImproved(true)
        setShowComparison(true)
        
        // 改善後のフローをチャットに送信
        try {
          // チャットインターフェースにメッセージを送信
          const chatMessage = `改善後のフロー：\n\n${steps.map((step, index) => 
            `【${step.title}】\n` +
            `- 説明: ${step.description}\n` +
            `- 担当: ${step.assignee}\n` +
            `- 所要時間: ${step.timeRequired}分\n` +
            `- ツール/設備: ${step.tools || '未設定'}\n` +
            `- コスト: ${step.cost !== undefined ? `${step.cost}円` : '未設定'}`
          ).join('\n\n')}`;
          
          // ローカルストレージにチャットメッセージを保存
          const chatMessages = localStorage.getItem('chat_messages') || '[]';
          const parsedMessages = JSON.parse(chatMessages);
          
          // システムメッセージとして追加
          parsedMessages.push({
            id: Date.now().toString(),
            content: chatMessage,
            sender: 'assistant',
            timestamp: new Date()
          });
          
          localStorage.setItem('chat_messages', JSON.stringify(parsedMessages));
          console.log('改善後のフローをチャットに送信しました');
        } catch (error) {
          console.error('チャットへのメッセージ送信エラー:', error);
        }
        
        return newImprovedWorkflow
      } catch (error) {
        console.error('API呼び出しエラー:', error)
        throw error
      }
    } catch (error) {
      console.error('改善案の生成中にエラーが発生しました:', error)
      throw error
    } finally {
      // ローディング状態を解除
      setIsLoading(false)
    }
  }

  // 改善後フローを1つ前の状態に戻す
  const revertWorkflow = () => {
    if (previousSteps && previousSteps.length > 0) {
      // 前の改善後フローがある場合は、それに戻す
      setImprovedSteps(previousSteps)
    } else {
      // 前の改善後フローがない場合は、比較表示を閉じる
      setIsImproved(false)
      setShowComparison(false)
    }
  }

  return {
    isLoading,
    customPrompt,
    setCustomPrompt,
    improveWorkflow,
    revertWorkflow
  }
}

/**
 * ワークフローの保存を処理するカスタムフック
 * @param workflow 現在のワークフロー
 * @param workflowName ワークフロー名
 * @param workflowDescription ワークフローの説明
 * @param steps ステップ配列
 * @param isImproved 改善フラグ
 * @param improvedSteps 改善後のステップ配列
 * @param improvedWorkflow 改善後のワークフロー
 * @param isCompleted 完了フラグ
 * @param setWorkflow ワークフローを設定する関数
 * @param setImprovedWorkflow 改善後のワークフローを設定する関数
 * @param onClose 閉じるコールバック
 * @returns 保存関連の操作関数
 */
export const useWorkflowSave = (
  workflow: Workflow | null,
  workflowName: string,
  workflowDescription: string,
  steps: WorkflowStep[],
  isImproved: boolean,
  improvedSteps: WorkflowStep[],
  improvedWorkflow: Workflow | null,
  isCompleted: boolean,
  setWorkflow: (workflow: Workflow | null) => void,
  setImprovedWorkflow: (workflow: Workflow | null) => void,
  onClose?: () => void
) => {
  // UserContextからユーザー情報を取得
  const { currentUser } = useUser()
  // ワークフローの保存
  const saveWorkflow = () => {
    if (!workflow) return

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

    // 既存フローの保存
    const updatedWorkflow: Workflow = {
      ...workflow,
      name: workflowName,
      description: workflowDescription,
      steps: steps,
      updatedAt: new Date(),
      isCompleted: isCompleted,
      completedAt: isCompleted ? workflow.completedAt || new Date() : undefined
    }

    // 新規作成の場合
    if (workflow.id === 'new') {
      updatedWorkflow.id = Date.now().toString()
      // 作成者情報を設定
      updatedWorkflow.createdBy = currentUser?.id
      workflows.push(updatedWorkflow)
    } else {
      // 既存ワークフローの更新
      const index = workflows.findIndex(wf => wf.id === workflow.id)
      if (index !== -1) {
        workflows[index] = updatedWorkflow
      } else {
        workflows.push(updatedWorkflow)
      }
    }

    // 改善後フローも保存（常に最新の状態を保存）
    if (improvedSteps.length > 0) {
      // 改善後ワークフローの作成または更新
      const improvedWorkflowData: Workflow = {
        id: improvedWorkflow ? improvedWorkflow.id : `improved-${updatedWorkflow.id}-${Date.now()}`,
        name: `${workflowName}（改善後）`,
        description: `${workflowDescription} - AIによる改善案`,
        steps: improvedSteps, // 現在の改善後ステップを使用
        createdAt: improvedWorkflow ? improvedWorkflow.createdAt : new Date(),
        updatedAt: new Date(),
        isImproved: true,
        originalId: updatedWorkflow.id,
        createdBy: currentUser?.id // 現在のユーザーIDを作成者として設定
      }

      // 既存の改善後ワークフローを検索
      const improvedIndex = workflows.findIndex(wf => wf.id === improvedWorkflowData.id)
      if (improvedIndex !== -1) {
        // 既存の改善後ワークフローを更新
        workflows[improvedIndex] = improvedWorkflowData
      } else {
        // 新しい改善後ワークフローを追加
        workflows.push(improvedWorkflowData)
      }

      // 状態を更新
      setImprovedWorkflow(improvedWorkflowData)
    }

    // ローカルストレージに保存
    localStorage.setItem('workflows', JSON.stringify(workflows))

    // ワークフローの状態を更新
    setWorkflow(updatedWorkflow)
    
    // 保存完了メッセージ
    alert('業務フローを保存しました')

    // 新規作成の場合のみ閉じるコールバックを呼び出す
    if (onClose && workflow.id === 'new') {
      onClose()
    }
    
    return updatedWorkflow
  }

  return {
    saveWorkflow
  }
}
