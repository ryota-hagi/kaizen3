'use client'

import { WorkflowStep as BaseWorkflowStep, Workflow } from '../../utils/api'

// WorkflowStep型を拡張してtoolsプロパティを追加
export interface WorkflowStep extends BaseWorkflowStep {
  tools?: string
}

/**
 * サンプルワークフローのステップを生成する
 * @returns サンプルワークフローのステップ配列
 */
export const generateSampleSteps = (): WorkflowStep[] => {
  return [
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
}

/**
 * サンプルワークフローを生成する
 * @param workflowId ワークフローID
 * @returns サンプルワークフロー
 */
export const generateSampleWorkflow = (workflowId: string): Workflow => {
  const sampleSteps = generateSampleSteps()

  return {
    id: workflowId,
    name: '受注処理フロー',
    description: '顧客からの注文を受け付けてから出荷までの業務フロー',
    steps: sampleSteps,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * テスト用の改善後フローを生成する
 * @param workflow 元のワークフロー
 * @returns 改善後のステップ配列
 */
export const generateTestImprovedFlow = (workflow: Workflow): WorkflowStep[] => {
  if (!workflow || !workflow.steps) return []
  
  // サンプルの改善後フローを生成
  return workflow.steps.map((step, index) => {
    // 自動化できそうなステップは自動化する
    const isAutomatable = step.title.includes('確認') || 
                         step.title.includes('入力') || 
                         step.title.includes('送信') || 
                         step.title.includes('発行') ||
                         step.title.includes('手配')
    
    // 自動化の場合のツール設定
    let tools = (step as WorkflowStep).tools || ''
    if (isAutomatable) {
      tools = '自動化システム'
      if (step.title.includes('入力') || step.title.includes('確認')) {
        tools = 'Zapier, 自動化システム'
      } else if (step.title.includes('発行')) {
        tools = 'クラウド会計システム, 自動化システム'
      } else if (step.title.includes('手配')) {
        tools = 'API連携, 自動化システム'
      }
    }
    
    return {
      id: `test-step-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      title: step.title,
      description: isAutomatable 
        ? `${step.description}（自動化により効率化）` 
        : step.description,
      assignee: isAutomatable ? '自動化' : step.assignee,
      timeRequired: isAutomatable ? Math.max(1, Math.floor(step.timeRequired / 3)) : step.timeRequired,
      position: index,
      tools: tools
    }
  })
}

/**
 * ClaudeAPIのレスポンスからステップ情報を抽出する
 * @param responseText APIレスポンステキスト
 * @param originalSteps 元のステップ配列
 * @returns 抽出されたステップ配列
 */
export const parseStepsFromResponse = (responseText: string, originalSteps: WorkflowStep[]): WorkflowStep[] => {
  try {
    console.log('レスポンステキストからステップ情報を抽出します')
    
    // 従業員情報を取得
    const savedEmployees = localStorage.getItem('kaizen_employees')
    let employees: any[] = []
    if (savedEmployees) {
      try {
        employees = JSON.parse(savedEmployees)
      } catch (error) {
        console.error('従業員情報の解析エラー:', error)
      }
    }
    
    // 正規表現でタグ付きの情報を抽出
    const stepRegex = /<工程名>(.*?)<\/工程名>\s*<概要>(.*?)<\/概要>\s*<担当者>(.*?)<\/担当者>\s*<所要時間>(.*?)<\/所要時間>\s*<ツール>(.*?)<\/ツール>\s*<コスト>(.*?)<\/コスト>/g
    const matches: RegExpExecArray[] = []
    let match: RegExpExecArray | null
    while ((match = stepRegex.exec(responseText)) !== null) {
      matches.push(match)
    }
    
    console.log(`${matches.length}個のステップ情報が見つかりました`)
    
    if (matches.length === 0) {
      // 抽出できなかった場合はエラーをスロー
      console.error('ステップ情報を抽出できませんでした。Claude APIのレスポンス:', responseText)
      throw new Error('改善案の生成に失敗しました。Claude APIからの応答を正しく解析できませんでした。')
    }
    
    // 抽出したステップ情報を変換
    return matches.map((match, index) => {
      const [_, title, description, assignee, timeRequiredStr, toolsStr, costStr] = match
      const timeRequired = parseInt(timeRequiredStr.trim(), 10) || 
                          (originalSteps[index] ? originalSteps[index].timeRequired : 10)
      
      // 担当者名を検証
      let validAssignee = assignee.trim()
      let cost: number | undefined = undefined
      let tools = toolsStr.trim() // ツール/設備情報を取得
      
      // 自動化の場合はそのまま
      if (validAssignee === '自動化') {
        cost = 0 // 自動化の場合はコスト0
        // 自動化の場合は適切なツール/設備を設定
        if (!tools) {
          tools = '自動化システム'
        }
      } else {
        // 従業員リストに存在するか確認
        const employee = employees.find(emp => emp.name === validAssignee)
        if (employee) {
          // 従業員が存在する場合は時給からコストを計算
          cost = Math.round(employee.hourlyRate * timeRequired / 60)
        } else {
          // 従業員が存在しない場合は元の担当者を使用
          validAssignee = originalSteps[index]?.assignee || validAssignee
          
          // 元の担当者が従業員リストに存在するか確認
          const originalEmployee = employees.find(emp => emp.name === validAssignee)
          if (originalEmployee) {
            cost = Math.round(originalEmployee.hourlyRate * timeRequired / 60)
          }
        }
      }
      
      return {
        id: `parsed-step-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        assignee: validAssignee,
        timeRequired: timeRequired,
        position: index,
        cost: cost,
        tools: tools
      }
    })
  } catch (error) {
    console.error('ステップ情報の抽出中にエラーが発生しました:', error)
    // エラー時もエラーをスロー
    throw new Error('改善案の生成中にエラーが発生しました。もう一度お試しください。')
  }
}
