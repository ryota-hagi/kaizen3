'use client'

import React, { useState, useEffect } from 'react'
import { Employee } from '../../utils/api'
import { SuggestionConfirmModal } from './SuggestionConfirmModal'
import { RegenerateStepsPromptModal } from './RegenerateStepsPromptModal'
import { parseStepsFromResponse } from './WorkflowEditorHelpers'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
  cost?: number
  tools?: string
}

interface WorkflowBlockModalProps {
  step: WorkflowStep | null
  onSave: (step: WorkflowStep) => void
  onClose: () => void
}

export const WorkflowBlockModal: React.FC<WorkflowBlockModalProps> = ({ step, onSave, onClose }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [timeRequired, setTimeRequired] = useState(0)
  const [cost, setCost] = useState<number | undefined>(undefined)
  const [tools, setTools] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  
  // 入力補助関連の状態
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedSteps, setSuggestedSteps] = useState<WorkflowStep[]>([])
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [additionalPrompt, setAdditionalPrompt] = useState('')

  // 従業員情報を取得
  useEffect(() => {
    const savedEmployees = localStorage.getItem('kaizen_employees')
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees)
        setEmployees(parsedEmployees)
      } catch (error) {
        console.error('従業員情報の解析エラー:', error)
      }
    }
  }, [])
  
  // 入力補助ボタンのクリックハンドラ
  const handleSupportButtonClick = async () => {
    if (!title) {
      alert('ステップのタイトルを入力してください')
      return
    }
    
    try {
      setIsGenerating(true)
      await generateBlockSuggestions()
    } catch (error) {
      console.error('ステップ提案の生成中にエラーが発生しました:', error)
      alert('ステップ提案の生成中にエラーが発生しました。もう一度お試しください。')
    } finally {
      setIsGenerating(false)
    }
  }
  
  // ブロック提案生成関数
  const generateBlockSuggestions = async (customPrompt?: string) => {
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
      let prompt = `
以下のステップタイトル「${title}」に基づいて、詳細な業務フローのステップを生成してください。
ステップタイトル: ${title}
ステップ説明: ${description || '未入力'}

${companyInfoText}
${employeesText}

このステップに関連する詳細なワークフローステップを4-6個程度提案してください。
例えば「テレアポ」というステップであれば、「リスト作成」「リスト管理」「テレアポ」「結果入力」などの関連ステップを提案してください。
`;

      // 追加のプロンプトがある場合は追加
      if (customPrompt) {
        prompt += `\n\n追加の要望: ${customPrompt}`;
      }

      prompt += `\n\n回答は必ず以下のフォーマットで各ステップごとに提供してください：
<工程名>ステップのタイトル</工程名>
<概要>ステップの説明</概要>
<担当者>担当者または「自動化」</担当者>
<所要時間>分数（数字のみ）</所要時間>
<ツール>使用するツールや設備（メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど）</ツール>
<コスト>コスト削減額または「なし」</コスト>

各タグは必ず含めてください。特に<ツール>タグは重要です。自動化の場合は「自動化システム」などの適切なツール名を指定してください。
`;

      // Claude APIを呼び出す
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          companyInfo: companyInfo,
          employees: employees
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // レスポンスからステップ情報を抽出
      const responseText = data.response;
      const extractedSteps = parseStepsFromResponse(responseText, []);
      
      // 提案モーダルを表示
      setSuggestedSteps(extractedSteps);
      setShowSuggestionModal(true);
      
    } catch (error) {
      console.error('ステップ提案の生成中にエラーが発生しました:', error);
      throw error;
    }
  };
  
  // 提案を採用する
  const handleAdoptSuggestion = () => {
    setShowSuggestionModal(false);
    
    // 最初のステップを現在のステップとして設定
    if (suggestedSteps.length > 0) {
      const firstStep = suggestedSteps[0];
      setTitle(firstStep.title);
      setDescription(firstStep.description);
      setAssignee(firstStep.assignee);
      setTimeRequired(firstStep.timeRequired);
      setTools(firstStep.tools || '');
      setCost(firstStep.cost);
      
      // 担当者が従業員リストに存在するか確認
      if (firstStep.assignee !== '自動化') {
        const employee = employees.find(emp => emp.name === firstStep.assignee);
        setSelectedEmployee(employee || null);
      } else {
        setSelectedEmployee(null);
      }
      
      // 残りのステップを保存
      if (suggestedSteps.length > 1) {
        localStorage.setItem('kaizen_suggested_steps', JSON.stringify(suggestedSteps.slice(1)));
      }
    }
  };
  
  // 再作成モーダルを表示
  const handleShowRegenerateModal = () => {
    setShowSuggestionModal(false);
    setShowRegenerateModal(true);
  };
  
  // 追加プロンプトで再生成
  const handleRegenerateWithPrompt = async (prompt: string) => {
    setShowRegenerateModal(false);
    setAdditionalPrompt(prompt);
    
    try {
      setIsGenerating(true);
      setShowSuggestionModal(true);
      await generateBlockSuggestions(prompt);
    } catch (error) {
      console.error('ステップ提案の再生成中にエラーが発生しました:', error);
      alert('ステップ提案の再生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (step) {
      setTitle(step.title)
      setDescription(step.description)
      setAssignee(step.assignee)
      setTimeRequired(step.timeRequired)
      setCost(step.cost)
      setTools(step.tools || '')
      
      // 担当者が従業員リストに存在するか確認
      if (employees.length > 0) {
        const employee = employees.find(emp => emp.name === step.assignee)
        setSelectedEmployee(employee || null)
      }
    } else {
      setTitle('')
      setDescription('')
      setAssignee('')
      setTimeRequired(0)
      setCost(undefined)
      setTools('')
      setSelectedEmployee(null)
    }
  }, [step, employees])

  // 担当者が変更されたときにコストを計算
  useEffect(() => {
    if (selectedEmployee && timeRequired > 0) {
      // 時給 × 所要時間（分）÷ 60で計算
      const calculatedCost = Math.round(selectedEmployee.hourlyRate * timeRequired / 60)
      setCost(calculatedCost)
    } else if (assignee === '自動化') {
      setCost(0)
    }
  }, [selectedEmployee, timeRequired, assignee])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const updatedStep: WorkflowStep = {
      id: step?.id || '',
      title,
      description,
      assignee,
      timeRequired,
      position: step?.position || 0,
      cost,
      tools: tools || undefined
    }
    
    onSave(updatedStep)
  }

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setAssignee(value)
    
    if (value === '自動化') {
      setSelectedEmployee(null)
      setCost(0)
    } else {
      const employee = employees.find(emp => emp.name === value)
      setSelectedEmployee(employee || null)
      
      if (employee && timeRequired > 0) {
        // 時給 × 所要時間（分）÷ 60で計算
        const calculatedCost = Math.round(employee.hourlyRate * timeRequired / 60)
        setCost(calculatedCost)
      }
    }
  }

  const handleTimeRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setTimeRequired(value)
    
    if (selectedEmployee && value > 0) {
      // 時給 × 所要時間（分）÷ 60で計算
      const calculatedCost = Math.round(selectedEmployee.hourlyRate * value / 60)
      setCost(calculatedCost)
    } else if (assignee === '自動化') {
      setCost(0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">
          {step ? 'ステップを編集' : '新規ステップを追加'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1">
              タイトル
            </label>
            <div className="flex">
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <button
                type="button"
                onClick={handleSupportButtonClick}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-r-md hover:bg-blue-200 transition-colors flex items-center justify-center"
                title="入力補助"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-secondary-500">
              入力補助ボタンをクリックすると、関連するステップを自動生成します
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
              説明
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="assignee" className="block text-sm font-medium text-secondary-700 mb-1">
              担当者
            </label>
            <select
              id="assignee"
              value={assignee}
              onChange={handleAssigneeChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">担当者を選択</option>
              <option value="自動化">自動化</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.name}>
                  {employee.name} ({employee.position})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="timeRequired" className="block text-sm font-medium text-secondary-700 mb-1">
              所要時間（分）
            </label>
            <input
              type="number"
              id="timeRequired"
              value={timeRequired}
              onChange={handleTimeRequiredChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="cost" className="block text-sm font-medium text-secondary-700 mb-1">
              コスト（円）
            </label>
            <input
              type="number"
              id="cost"
              value={cost || 0}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              readOnly={selectedEmployee !== null || assignee === '自動化'}
            />
            {selectedEmployee && (
              <p className="text-xs text-secondary-500 mt-1">
                {selectedEmployee.name}の時給: {selectedEmployee.hourlyRate}円/時
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <label htmlFor="tools" className="block text-sm font-medium text-secondary-700 mb-1">
              ツール/設備
            </label>
            <input
              type="text"
              id="tools"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど"
            />
            <p className="text-xs text-secondary-500 mt-1">
              このブロックの業務工程を実行するために使う具体的なツールや設備名
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
      
      {/* 提案確認モーダル */}
      {showSuggestionModal && (
        <SuggestionConfirmModal
          suggestedSteps={suggestedSteps}
          onAdopt={handleAdoptSuggestion}
          onRegenerate={handleShowRegenerateModal}
          onCancel={() => setShowSuggestionModal(false)}
          isLoading={isGenerating}
        />
      )}
      
      {/* 再生成プロンプトモーダル */}
      {showRegenerateModal && (
        <RegenerateStepsPromptModal
          onSubmit={handleRegenerateWithPrompt}
          onCancel={() => setShowRegenerateModal(false)}
          defaultPrompt={additionalPrompt}
        />
      )}
    </div>
  )
}
