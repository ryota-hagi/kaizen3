'use client'

import React, { useState, useEffect } from 'react'
import { WorkflowStep } from './WorkflowEditorHelpers'
import { WorkflowBlockModal } from './WorkflowBlockModal'
import { RegeneratePromptModal } from './RegeneratePromptModal'
import { WorkflowComparison } from './WorkflowComparison'
import { WorkflowEditorHeader } from './WorkflowEditorHeader'
import { WorkflowEditorForm } from './WorkflowEditorForm'
import { WorkflowEditorSteps } from './WorkflowEditorSteps'
import { WorkflowEditorMetrics } from './WorkflowEditorMetrics'
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
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-6 border border-blue-100">
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
    </div>
  )
}
