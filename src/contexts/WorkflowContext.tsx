'use client'

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react'
import { useUser } from './UserContext'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
  tools?: string
  cost?: number
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
  createdBy?: string // 作成者のユーザーID
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
  const { currentUser } = useUser()

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

  const improveWorkflow = async () => {
    if (!currentWorkflow) return

    try {
      // ローディング状態を設定（必要に応じて）
      // setIsLoading(true)
      
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

      // 会社情報と従業員情報をプロンプトに含める
      const companyInfoText = companyInfo ? 
        `会社情報:
会社名: ${companyInfo.name || '未設定'}
業種: ${companyInfo.industry || '未設定'}
事業内容: ${companyInfo.businessDescription || '未設定'}
規模: ${companyInfo.size || '未設定'}
所在地: ${companyInfo.address || '未設定'}` : '';

      const employeesText = employees && employees.length > 0 ? 
        `\n\n従業員情報:
${employees.map((emp: any) => `- ${emp.name || '名前未設定'} (${emp.position || '役職未設定'}, ${emp.department || '部署未設定'}, 時給: ${emp.hourlyRate || 0}円)`).join('\n')}` : '';

      // Claudeに送信するプロンプトを作成
      const prompt = `
以下の業務フロー「${currentWorkflow.name}」を分析して、自動化や効率化が可能な改善案を提案してください。
業務フローの説明: ${currentWorkflow.description}

各ステップについて、自動化できるものは担当を「自動化」に変更し、所要時間も短縮してください。
改善案は元のステップ数を維持しつつ、各ステップの内容、担当者、所要時間を最適化してください。

以下の点を考慮して改善案を提案してください：
1. 自動化できるステップを特定し、担当を「自動化」に変更
2. 自動化により所要時間を短縮
3. 適切なツール/設備を提案（特に自動化の場合）
4. コスト削減効果を試算
5. 業務フロー全体の効率化

回答は必ず以下のフォーマットで各ステップごとに提供してください：
<工程名>ステップのタイトル</工程名>
<概要>ステップの説明</概要>
<担当者>担当者または「自動化」</担当者>
<所要時間>分数（数字のみ）</所要時間>
<ツール>使用するツールや設備（メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど）</ツール>
<コスト>コスト削減額または「なし」</コスト>

各タグは必ず含めてください。特に<ツール>タグは重要です。自動化の場合は「自動化システム」などの適切なツール名を指定してください。
`;

      console.log('Sending request to Claude API');

      // 関連するワークフローの情報を取得
      let relatedWorkflow = null;
      if (originalWorkflow && originalWorkflow.id !== currentWorkflow.id) {
        relatedWorkflow = {
          id: originalWorkflow.id,
          name: originalWorkflow.name,
          description: originalWorkflow.description,
          steps: originalWorkflow.steps,
          isImproved: originalWorkflow.isImproved || false
        };
      }

      // リクエストボディを作成
      const requestBody = {
        message: prompt,
        companyInfo: companyInfo,
        employees: employees,
        workflowContext: {
          id: currentWorkflow.id,
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          steps: currentWorkflow.steps,
          isImproved: false,
          relatedWorkflow: relatedWorkflow
        }
      };

      // デバッグ用にリクエストボディを出力
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      // Claude APIを呼び出す
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('Claude API Response:', data)

      // レスポンスからステップ情報を抽出
      const responseText = data.response
      
      // 正規表現でタグ付きの情報を抽出
      const stepRegex = /<工程名>(.*?)<\/工程名>\s*<概要>(.*?)<\/概要>\s*<担当者>(.*?)<\/担当者>\s*<所要時間>(.*?)<\/所要時間>\s*<ツール>(.*?)<\/ツール>\s*<コスト>(.*?)<\/コスト>/g
      const matches: RegExpExecArray[] = []
      let match: RegExpExecArray | null
      while ((match = stepRegex.exec(responseText)) !== null) {
        matches.push(match)
      }
      
      let improvedSteps: WorkflowStep[] = []
      
      if (matches.length === 0) {
        // 抽出できなかった場合はエラーメッセージを表示
        console.error('ステップ情報を抽出できませんでした。Claude APIのレスポンス:', responseText)
        throw new Error('改善案の生成に失敗しました。Claude APIからの応答を正しく解析できませんでした。')
      } else {
        // 抽出したステップ情報を変換
        improvedSteps = matches.map((match, index) => {
          const [_, title, description, assignee, timeRequiredStr, toolsStr, costStr] = match
          const timeRequired = parseInt(timeRequiredStr.trim(), 10) || 
                              (currentWorkflow.steps[index] ? currentWorkflow.steps[index].timeRequired : 10)
          
          return {
            id: `step-${Date.now()}-${index}`,
            title: title.trim(),
            description: description.trim(),
            assignee: assignee.trim(),
            timeRequired: timeRequired,
            position: index,
            tools: toolsStr.trim()
          }
        })
      }

      // 改善後のワークフローを作成
      const newImprovedWorkflow: Workflow = {
        id: `improved-${Date.now()}`,
        name: `${currentWorkflow.name}（改善後）`,
        description: `${currentWorkflow.description} - AIによる改善案`,
        steps: improvedSteps,
        createdAt: new Date(),
        updatedAt: new Date(),
        isImproved: true,
        originalId: currentWorkflow.id,
        createdBy: currentUser?.id // 現在のユーザーIDを作成者として設定
      }

      setCurrentWorkflow(newImprovedWorkflow)
      setIsImproved(true)
      setShowComparison(true)
      
      // 改善後のフローをチャットに送信
      try {
        // チャットインターフェースにメッセージを送信
        const chatMessage = `改善後のフロー：\n\n${improvedSteps.map((step, index) => 
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
      
    } catch (error) {
      console.error('改善案の生成中にエラーが発生しました:', error)
      alert('改善案の生成中にエラーが発生しました。もう一度お試しください。')
    } finally {
      // ローディング状態を解除（必要に応じて）
      // setIsLoading(false)
    }
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
        id: Date.now().toString(),
        createdBy: currentUser?.id // 現在のユーザーIDを作成者として設定
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
