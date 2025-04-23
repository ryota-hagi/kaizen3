'use client'

import React, { useState } from 'react'
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

// 分割したコンポーネントとヘルパー関数をインポート
import { WorkflowBlock } from './WorkflowBlock'
import { WorkflowBlockModal } from './WorkflowBlockModal'
import { RegeneratePromptModal } from './RegeneratePromptModal'
import { WorkflowComparison } from './WorkflowComparison'
import { WorkflowStep } from './WorkflowEditorHelpers'
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

  // ドラッグ＆ドロップの処理
  const handleDragEnd = (result: any) => {
    console.log('handleDragEnd called', result)
    if (!result.destination) return

    reorderSteps(result.source.index, result.destination.index)
  }

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

  // 総所要時間とコストの計算（比較表示用）
  const originalTotalTime = originalSteps.reduce((total, step) => total + step.timeRequired, 0)
  const improvedTotalTime = improvedSteps.reduce((total, step) => total + step.timeRequired, 0)
  const timeSaved = originalTotalTime - improvedTotalTime
  
  // コストの計算
  const originalTotalCost = originalSteps.reduce((total, step) => total + (step.cost || 0), 0)
  const improvedTotalCost = improvedSteps.reduce((total, step) => total + (step.cost || 0), 0)
  const costSaved = originalTotalCost - improvedTotalCost

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-6 border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center">
            <span className="bg-primary-100 text-primary-700 p-2 rounded-full mr-3 shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </span>
            {workflowId === 'new' ? '新規業務フロー作成' : '業務フロー編集'}
          </h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-sm text-secondary-500 hover:text-secondary-700 flex items-center mt-2 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              ダッシュボードに戻る
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          {steps.length > 0 && !isImproved && !improvedWorkflow && (
            <button 
              className={`btn ${isLoading ? 'btn-secondary opacity-70 cursor-not-allowed' : 'btn-secondary'}`}
              onClick={() => improveWorkflow()}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : '改善案を表示'}
            </button>
          )}
          {isImproved && (
            <>
              <button 
                className={`btn ${isLoading ? 'btn-secondary opacity-70 cursor-not-allowed' : 'btn-secondary'}`}
                onClick={handleOpenRegenerateModal}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </span>
                ) : '再提案'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={revertWorkflow}
                disabled={isLoading}
              >
                元に戻す
              </button>
            </>
          )}
          {improvedWorkflow && !showComparison && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowComparison(true)}
            >
              改善案を表示
            </button>
          )}
          {showComparison && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowComparison(false)}
            >
              比較を閉じる
            </button>
          )}
          <button
            onClick={() => setIsCompleted(!isCompleted)}
            className={`btn flex items-center ${isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'} shadow-sm transition-all duration-200 mr-2`}
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isCompleted ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}></path>
            </svg>
            {isCompleted ? '完了済み' : '完了'}
          </button>
          <button 
            className="btn bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 flex items-center"
            onClick={saveWorkflow}
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
            </svg>
            保存
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4 bg-white p-5 rounded-lg shadow-inner border border-blue-100">
        <div>
          <label htmlFor="workflowName" className="block text-sm font-medium text-secondary-700 mb-1 flex items-center">
            <svg className="w-5 h-5 mr-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            フロー名
          </label>
          <input
            type="text"
            id="workflowName"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all duration-200"
            required
          />
        </div>
        
        <div>
          <label htmlFor="workflowDescription" className="block text-sm font-medium text-secondary-700 mb-1 flex items-center">
            <svg className="w-5 h-5 mr-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
            </svg>
            説明
          </label>
          <textarea
            id="workflowDescription"
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all duration-200"
            rows={2}
          />
        </div>
      </div>

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
        <>
          <div className="mb-4">
            <h3 className="text-lg font-medium text-secondary-900 flex items-center">
              <span className="bg-secondary-100 text-secondary-700 p-2 rounded-full mr-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
              </span>
              ステップ
            </h3>
          </div>

          {isImproved && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-md">
              <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                <span className="bg-green-100 text-green-700 p-2 rounded-full mr-2 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </span>
                改善効果
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transform transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="text-sm font-medium text-green-600">元の所要時間</p>
                  </div>
                  <p className="text-xl font-bold text-green-800">{originalTotalTime}分</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transform transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="text-sm font-medium text-green-600">改善後の所要時間</p>
                  </div>
                  <p className="text-xl font-bold text-green-800">{improvedTotalTime}分</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transform transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
                    </svg>
                    <p className="text-sm font-medium text-green-600">削減時間</p>
                  </div>
                  <p className="text-xl font-bold text-green-800">{timeSaved}分 
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {Math.round((timeSaved / originalTotalTime) * 100)}%削減
                    </span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transform transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <p className="text-sm font-medium text-purple-600">自動化ステップ</p>
                  </div>
                  <p className="text-xl font-bold text-purple-800">
                    {improvedSteps.filter(step => step.assignee === '自動化').length}ステップ
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 animate-pulse">
                      自動化
                    </span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transform transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="text-sm font-medium text-green-600">元のコスト</p>
                  </div>
                  <p className="text-xl font-bold text-green-800">{originalTotalCost.toLocaleString()}円</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 transform transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="text-sm font-medium text-green-600">改善後のコスト</p>
                  </div>
                  <p className="text-xl font-bold text-green-800">{improvedTotalCost.toLocaleString()}円</p>
                </div>
                <div className="col-span-2 bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg shadow-sm border border-green-200 transform transition-transform duration-300 hover:scale-102">
                  <div className="flex items-center mb-2">
                    <svg className="w-6 h-6 text-green-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <p className="text-base font-medium text-green-700">コスト削減</p>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {costSaved.toLocaleString()}円 
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                      {originalTotalCost > 0 ? Math.round((costSaved / originalTotalCost) * 100) : 0}%削減
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="workflow-steps" direction="vertical">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300"
                  style={{ minHeight: '100px' }}
                >
                  {steps.length === 0 ? (
                    <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200">
                      <svg className="w-16 h-16 mx-auto text-blue-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p className="text-secondary-600 font-medium mb-2">ステップがありません</p>
                      <p className="text-secondary-500 mb-4">「ステップを追加」ボタンをクリックして業務フローを作成してください。</p>
                      <button 
                        className="btn bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-200 flex items-center mx-auto"
                        onClick={handleAddStep}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        ステップを追加
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {steps.map((step, index) => (
                        <Draggable 
                          key={`draggable-${index}`} 
                          draggableId={step.id} 
                          index={index}
                        >
                          {(provided) => (
                              <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="relative border border-secondary-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                              style={{...provided.draggableProps.style}}
                            >
                              <WorkflowBlock
                                step={step}
                                onEdit={() => handleEditStep(step)}
                                onDelete={() => deleteStep(step.id)}
                                dragHandleProps={provided.dragHandleProps}
                                onMoveUp={() => reorderSteps(index, index - 1)}
                                onMoveDown={() => reorderSteps(index, index + 1)}
                                isFirst={index === 0}
                                isLast={index === steps.length - 1}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                  <div className="mt-6 text-center">
                    <button 
                      className="btn bg-gradient-to-r from-blue-500 to-primary-500 hover:from-blue-600 hover:to-primary-600 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 flex items-center mx-auto"
                      onClick={handleAddStep}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      ステップを追加
                    </button>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}

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
