'use client'

import React from 'react'

interface WorkflowEditorHeaderProps {
  workflowId: string
  workflowName: string
  isLoading: boolean
  isImproved: boolean
  improvedWorkflow: any | null
  showComparison: boolean
  onClose?: () => void
  onImproveWorkflow: () => void
  onRegenerateWorkflow: () => void
  onRevertWorkflow: () => void
  onToggleComparison: (show: boolean) => void
  onToggleCompleted: () => void
  isCompleted: boolean
  onSaveWorkflow: () => void
}

export const WorkflowEditorHeader: React.FC<WorkflowEditorHeaderProps> = ({
  workflowId,
  workflowName,
  isLoading,
  isImproved,
  improvedWorkflow,
  showComparison,
  onClose,
  onImproveWorkflow,
  onRegenerateWorkflow,
  onRevertWorkflow,
  onToggleComparison,
  onToggleCompleted,
  isCompleted,
  onSaveWorkflow
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center">
            <span className="bg-primary-100 text-primary-700 p-2 rounded-full mr-3 shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </span>
            <span className="whitespace-nowrap">{workflowId === 'new' ? '新規業務フロー作成' : '業務フロー編集'}</span>
          </h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-sm text-secondary-500 hover:text-secondary-700 flex items-center mt-2 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              ホームへ戻る
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {/* 共同編集者管理へのリンク */}
        <a 
          href={`/workflows/${workflowId}`}
          className="btn btn-secondary flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
          共同編集者管理
        </a>

        {/* 改善案ボタン */}
        {!isImproved && !improvedWorkflow && (
          <button 
            className={`btn ${isLoading ? 'btn-secondary opacity-70 cursor-not-allowed' : 'btn-secondary'} flex items-center`}
            onClick={onImproveWorkflow}
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
            ) : (
              <>
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                改善案を表示
              </>
            )}
          </button>
        )}
        
        {/* 再提案・元に戻すボタン */}
        {isImproved && (
          <>
            <button 
              className={`btn ${isLoading ? 'btn-secondary opacity-70 cursor-not-allowed' : 'btn-secondary'}`}
              onClick={onRegenerateWorkflow}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-secondary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  再提案
                </>
              )}
            </button>
            <button 
              className="btn btn-secondary flex items-center"
              onClick={onRevertWorkflow}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
              </svg>
              元に戻す
            </button>
          </>
        )}
        
        {/* 改善案表示・非表示ボタン */}
        {improvedWorkflow && !showComparison && (
          <button 
            className="btn btn-secondary flex items-center"
            onClick={() => onToggleComparison(true)}
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            改善案を表示
          </button>
        )}
        {showComparison && (
          <button 
            className="btn btn-secondary flex items-center"
            onClick={() => onToggleComparison(false)}
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            比較を閉じる
          </button>
        )}
        
        {/* 完了ボタン */}
        <button
          onClick={onToggleCompleted}
          className={`btn flex items-center ${isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'} shadow-sm transition-all duration-200 mr-2`}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isCompleted ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}></path>
          </svg>
          {isCompleted ? '完了済み' : '完了'}
        </button>
        
        {/* 保存ボタン */}
        <button 
          className="btn bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 flex items-center"
          onClick={onSaveWorkflow}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          保存
        </button>
      </div>
    </div>
  )
}
