'use client'

import React, { useState, useEffect } from 'react'
import { WorkflowStep, parseStepsFromResponse } from './WorkflowEditorHelpers'
import { WorkflowBlockModal } from './WorkflowBlockModal'
import { RegeneratePromptModal } from './RegeneratePromptModal'
import { WorkflowComparison } from './WorkflowComparison'
import { WorkflowEditorHeader } from './WorkflowEditorHeader'
import { WorkflowEditorForm } from './WorkflowEditorForm'
import { WorkflowEditorSteps } from './WorkflowEditorSteps'
import { WorkflowEditorMetrics } from './WorkflowEditorMetrics'
import { WorkflowSupportModal } from './WorkflowSupportModal'
import { 
  useWorkflowData, 
  useWorkflowImprovement, 
  useWorkflowSave 
} from './WorkflowEditorHooks'

interface WorkflowEditorProps {
  workflowId: string
  onClose?: () => void
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflowId, onClose }) => {
  // ワークフローデータの状態管理
  const {
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
    accessLevel,
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
    setAccessLevel,
    updateWorkflowData,
    addStep,
    editStep,
    deleteStep,
    reorderSteps
  } = useWorkflowData(workflowId)

  // ワークフロー改善の状態管理
  const {
    isLoading,
    customPrompt,
    setCustomPrompt,
    improveWorkflow,
    revertWorkflow
  } = useWorkflowImprovement(
    workflow,
    originalSteps,
    improvedSteps,
    setImprovedSteps,
    setPreviousImprovedSteps,
    setIsImproved,
    setShowComparison,
    setImprovedWorkflow,
    workflowName,
    workflowDescription,
    improvedWorkflow
  )

  // ワークフロー保存の状態管理
  const {
    saveWorkflow
  } = useWorkflowSave(
    workflow,
    workflowName,
    workflowDescription,
    steps,
    isImproved,
    improvedSteps,
    improvedWorkflow,
    isCompleted,
    setWorkflow,
    setImprovedWorkflow,
    onClose
  )

  // モーダル表示の状態管理
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null)
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)
  
  // 入力補助関連の状態管理
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [suggestedSteps, setSuggestedSteps] = useState<WorkflowStep[]>([])
  const [isSupportLoading, setIsSupportLoading] = useState(false)
  const [currentSubdivideStepId, setCurrentSubdivideStepId] = useState<string | null>(null)
  const [subdivideInsertIndex, setSubdivideInsertIndex] = useState<number>(-1)

  // ステップ追加ボタンのクリックハンドラ
  const handleAddStep = () => {
    setCurrentStep(null)
    setIsModalOpen(true)
  }

  // ステップ編集ボタンのクリックハンドラ
  const handleEditStep = (step: WorkflowStep) => {
    setCurrentStep(step)
    setIsModalOpen(true)
  }

  // ステップ保存ハンドラ
  const handleSaveStep = (step: WorkflowStep) => {
    if (currentStep) {
      // 既存ステップの編集
      editStep(step.id, step)
    } else {
      // 新規ステップの追加
      addStep(step)
    }
    
    setIsModalOpen(false)
  }

  // 再提案モーダルを開く
  const handleOpenRegenerateModal = () => {
    setIsRegenerateModalOpen(true)
  }

  // 改善案を再生成する
  const handleRegenerateWorkflow = async (prompt?: string) => {
    setIsRegenerateModalOpen(false)
    
    // カスタムプロンプトを設定
    if (prompt) {
      setCustomPrompt(prompt)
    }
    
    // 改善案を再生成
    await improveWorkflow(prompt)
  }
  
  // 細分化ボタンのクリックハンドラ
  const handleSubdivideStep = async (stepId: string) => {
    setIsSupportModalOpen(true)
    setIsSupportLoading(true)
    setCurrentSubdivideStepId(stepId)
    
    // 細分化するステップの位置を特定
    const stepIndex = steps.findIndex(step => step.id === stepId)
    if (stepIndex !== -1) {
      setSubdivideInsertIndex(stepIndex)
    }
    
    try {
      // 細分化するステップを取得
      const stepToSubdivide = steps.find(step => step.id === stepId)
      if (!stepToSubdivide) {
        throw new Error('細分化するステップが見つかりません')
      }
      
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

      // Claudeに送信するプロンプトを作成
      const prompt = `
以下の業務フローのステップを細分化して、より詳細な3つのサブステップに分割してください。
これは改善前の業務フローを詳細に洗い出すことが目的です。自動化などの改善は行わず、現状の業務をより詳細に分解してください。

業務フロー名: ${workflowName}
説明: ${workflowDescription || '未入力'}

細分化するステップ:
タイトル: ${stepToSubdivide.title}
説明: ${stepToSubdivide.description}
担当: ${stepToSubdivide.assignee}
所要時間: ${stepToSubdivide.timeRequired}分
${stepToSubdivide.tools ? `ツール/設備: ${stepToSubdivide.tools}` : ''}

${companyInfo ? `会社情報:
会社名: ${companyInfo.name || '未設定'}
業種: ${companyInfo.industry || '未設定'}
事業内容: ${companyInfo.businessDescription || '未設定'}
規模: ${companyInfo.size || '未設定'}
所在地: ${companyInfo.address || '未設定'}` : ''}

${employees && employees.length > 0 ? `従業員情報:
${employees.map((emp: any) => `- ${emp.name || '名前未設定'} (${emp.position || '役職未設定'}, ${emp.department || '部署未設定'}, 時給: ${emp.hourlyRate || 0}円)`).join('\n')}` : ''}

このステップを3つの詳細なサブステップに分割してください。分割したステップの合計所要時間は元のステップの所要時間と同じになるようにしてください。
各サブステップには、タイトル、説明、担当者、所要時間、使用するツールや設備を含めてください。

回答は必ず以下のフォーマットで各ステップごとに提供してください：
<工程名>ステップのタイトル</工程名>
<概要>ステップの説明</概要>
<担当者>担当者</担当者>
<所要時間>分数（数字のみ）</所要時間>
<ツール>使用するツールや設備（メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど）</ツール>
<コスト>コスト削減額または「なし」</コスト>

各タグは必ず含めてください。特に<ツール>タグは重要です。
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
      
      // 提案モーダルに表示するためのステップを設定
      setSuggestedSteps(extractedSteps);
      
    } catch (error) {
      console.error('ステップ細分化の生成中にエラーが発生しました:', error);
      alert('ステップ細分化の生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSupportLoading(false);
    }
  }
  
  // 提案されたステップを採用する
  const handleAdoptSuggestedSteps = (suggestedSteps: WorkflowStep[]) => {
    if (currentSubdivideStepId && subdivideInsertIndex >= 0) {
      // 元のステップを除外した新しい配列を作成
      const filteredSteps = steps.filter(step => step.id !== currentSubdivideStepId);
      
      // 新しいステップを作成
      const newSteps = suggestedSteps.map((step, index) => ({
        ...step,
        id: `step-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        position: subdivideInsertIndex + index
      }));
      
      // 挿入位置に新しいステップを追加
      const resultSteps = [
        ...filteredSteps.slice(0, subdivideInsertIndex),
        ...newSteps,
        ...filteredSteps.slice(subdivideInsertIndex)
      ];
      
      // 位置情報を更新
      const updatedSteps = resultSteps.map((step, index) => ({
        ...step,
        position: index
      }));
      
      // ステップを更新
      setSteps(updatedSteps);
      
      // ワークフローの更新日時を更新
      if (workflow) {
        const updatedWorkflow = {
          ...workflow,
          steps: updatedSteps,
          updatedAt: new Date()
        };
        setWorkflow(updatedWorkflow);
      }
    }
    
    // モーダルを閉じる
    setIsSupportModalOpen(false);
    setCurrentSubdivideStepId(null);
    setSubdivideInsertIndex(-1);
  }
  
  // 提案を再生成する
  const handleRegenerateSuggestion = async (prompt: string) => {
    setIsSupportLoading(true);
    
    try {
      // 細分化するステップを取得
      const stepToSubdivide = steps.find(step => step.id === currentSubdivideStepId)
      if (!stepToSubdivide) {
        throw new Error('細分化するステップが見つかりません')
      }
      
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

      // Claudeに送信するプロンプトを作成
      const newPrompt = `
以下の業務フローのステップを細分化して、より詳細な3つのサブステップに分割してください。
これは改善前の業務フローを詳細に洗い出すことが目的です。自動化などの改善は行わず、現状の業務をより詳細に分解してください。

業務フロー名: ${workflowName}
説明: ${workflowDescription || '未入力'}

細分化するステップ:
タイトル: ${stepToSubdivide.title}
説明: ${stepToSubdivide.description}
担当: ${stepToSubdivide.assignee}
所要時間: ${stepToSubdivide.timeRequired}分
${stepToSubdivide.tools ? `ツール/設備: ${stepToSubdivide.tools}` : ''}

${companyInfo ? `会社情報:
会社名: ${companyInfo.name || '未設定'}
業種: ${companyInfo.industry || '未設定'}
事業内容: ${companyInfo.businessDescription || '未設定'}
規模: ${companyInfo.size || '未設定'}
所在地: ${companyInfo.address || '未設定'}` : ''}

${employees && employees.length > 0 ? `従業員情報:
${employees.map((emp: any) => `- ${emp.name || '名前未設定'} (${emp.position || '役職未設定'}, ${emp.department || '部署未設定'}, 時給: ${emp.hourlyRate || 0}円)`).join('\n')}` : ''}

追加の要望: ${prompt}

このステップを3つの詳細なサブステップに分割してください。分割したステップの合計所要時間は元のステップの所要時間と同じになるようにしてください。
各サブステップには、タイトル、説明、担当者、所要時間、使用するツールや設備を含めてください。

回答は必ず以下のフォーマットで各ステップごとに提供してください：
<工程名>ステップのタイトル</工程名>
<概要>ステップの説明</概要>
<担当者>担当者</担当者>
<所要時間>分数（数字のみ）</所要時間>
<ツール>使用するツールや設備（メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど）</ツール>
<コスト>コスト削減額または「なし」</コスト>

各タグは必ず含めてください。特に<ツール>タグは重要です。
`;

      // Claude APIを呼び出す
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newPrompt,
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
      
      // 提案モーダルに表示するためのステップを設定
      setSuggestedSteps(extractedSteps);
      
    } catch (error) {
      console.error('ステップ提案の再生成中にエラーが発生しました:', error);
      alert('ステップ提案の再生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSupportLoading(false);
    }
  }

  // 変更検知と警告機能
  useEffect(() => {
    // 変更があるかどうかを判定する関数
    const hasUnsavedChanges = () => {
      // 元のワークフローと現在のワークフローを比較
      if (!workflow) return false;
      
      // 名前または説明が変更されている場合
      if (workflowName !== workflow.name || 
          workflowDescription !== workflow.description) {
        return true;
      }
      
      // ステップが変更されている場合
      if (JSON.stringify(steps) !== JSON.stringify(workflow.steps)) {
        return true;
      }
      
      return false;
    };
    
    // beforeunloadイベントハンドラ
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        // 標準のブラウザ警告メッセージを表示
        const message = '変更が保存されていません。このページを離れますか？';
        e.returnValue = message;
        return message;
      }
    };
    
    // イベントリスナーを追加
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [workflow, workflowName, workflowDescription, steps]);

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-4 md:p-6 border border-blue-100 w-full max-w-full">
      {/* ヘッダー部分 */}
      <WorkflowEditorHeader
        workflowId={workflowId}
        workflowName={workflowName}
        isLoading={isLoading}
        isImproved={isImproved}
        improvedWorkflow={improvedWorkflow}
        showComparison={showComparison}
        onClose={onClose}
        onImproveWorkflow={() => improveWorkflow()}
        onRegenerateWorkflow={handleOpenRegenerateModal}
        onRevertWorkflow={revertWorkflow}
        onToggleComparison={setShowComparison}
        onToggleCompleted={() => setIsCompleted(!isCompleted)}
        isCompleted={isCompleted}
        onSaveWorkflow={saveWorkflow}
      />

      {/* フォーム部分 */}
      <WorkflowEditorForm
        workflowName={workflowName}
        workflowDescription={workflowDescription}
        setWorkflowName={setWorkflowName}
        setWorkflowDescription={setWorkflowDescription}
        accessLevel={accessLevel}
        setAccessLevel={setAccessLevel}
      />

      {/* 改善効果の表示 */}
      {isImproved && (
        <WorkflowEditorMetrics
          originalSteps={originalSteps}
          improvedSteps={improvedSteps}
        />
      )}

      {/* 比較表示または通常表示 */}
      {showComparison ? (
        <WorkflowComparison
          originalSteps={originalSteps}
          improvedSteps={improvedSteps}
          onRegenerate={handleOpenRegenerateModal}
          onRevert={revertWorkflow}
          isLoading={isLoading}
          onEditStep={(stepId, updates) => {
            // 改善後ステップの編集
            const updatedSteps = improvedSteps.map(step => 
              step.id === stepId ? { ...step, ...updates } : step
            );
            setImprovedSteps(updatedSteps);
          }}
          onDeleteStep={(stepId) => {
            // 改善後ステップの削除
            const filteredSteps = improvedSteps.filter(step => step.id !== stepId);
            // 位置情報を更新
            const updatedSteps = filteredSteps.map((step, index) => ({
              ...step,
              position: index
            }));
            setImprovedSteps(updatedSteps);
          }}
          onAddStep={(stepData) => {
            // 新規ステップの追加
            const newStep: WorkflowStep = {
              ...stepData,
              id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: improvedSteps.length
            };
            setImprovedSteps([...improvedSteps, newStep]);
          }}
        />
      ) : (
        <WorkflowEditorSteps
          steps={steps}
          onAddStep={handleAddStep}
          onEditStep={handleEditStep}
          onDeleteStep={deleteStep}
          onReorderSteps={reorderSteps}
          onSubdivideStep={handleSubdivideStep}
        />
      )}

      {/* モーダル */}
      {isModalOpen && (
        <WorkflowBlockModal
          step={currentStep}
          onSave={handleSaveStep}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isRegenerateModalOpen && (
        <RegeneratePromptModal
          isOpen={isRegenerateModalOpen}
          onClose={() => setIsRegenerateModalOpen(false)}
          onSubmit={handleRegenerateWorkflow}
          defaultPrompt={customPrompt}
        />
      )}
      
      {/* 入力補助モーダル */}
      <WorkflowSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => {
          setIsSupportModalOpen(false);
          setCurrentSubdivideStepId(null);
          setSubdivideInsertIndex(-1);
        }}
        onAdopt={handleAdoptSuggestedSteps}
        onRegenerate={handleRegenerateSuggestion}
        suggestedSteps={suggestedSteps}
        isLoading={isSupportLoading}
        isSubdividing={currentSubdivideStepId !== null}
        subdivideStepTitle={steps.find(step => step.id === currentSubdivideStepId)?.title || ''}
      />
    </div>
  )
}
