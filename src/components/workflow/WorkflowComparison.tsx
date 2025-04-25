'use client'

import React, { useState } from 'react'
import { WorkflowStep } from './WorkflowEditorHelpers'
import { WorkflowBlockModal } from './WorkflowBlockModal'

interface WorkflowComparisonProps {
  originalSteps: WorkflowStep[]
  improvedSteps: WorkflowStep[]
  onRegenerate: () => void
  onRevert: () => void
  isLoading: boolean
  onEditStep?: (stepId: string, updates: Partial<WorkflowStep>) => void
  onDeleteStep?: (stepId: string) => void
  onAddStep?: (step: Omit<WorkflowStep, 'id' | 'position'>) => void
}

export const WorkflowComparison: React.FC<WorkflowComparisonProps> = ({
  originalSteps,
  improvedSteps,
  onRegenerate,
  onRevert,
  isLoading,
  onEditStep,
  onDeleteStep,
  onAddStep
}) => {
  // モーダル表示の状態管理
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null)
  
  // 総所要時間とコストの計算
  const originalTotalTime = originalSteps.reduce((total, step) => total + step.timeRequired, 0)
  const improvedTotalTime = improvedSteps.reduce((total, step) => total + step.timeRequired, 0)
  const timeSaved = originalTotalTime - improvedTotalTime
  
  // コストの計算
  const originalTotalCost = originalSteps.reduce((total, step) => total + (step.cost || 0), 0)
  const improvedTotalCost = improvedSteps.reduce((total, step) => total + (step.cost || 0), 0)
  const costSaved = originalTotalCost - improvedTotalCost

  // ステップの保存ハンドラ
  const handleSaveStep = (step: WorkflowStep) => {
    if (!onEditStep || !onAddStep) return;
    
    if (currentStep) {
      // 既存ステップの編集
      onEditStep(step.id, step);
    } else {
      // 新規ステップの追加
      onAddStep(step);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-secondary-900 mb-4">既存フローと改善後フローの比較</h3>
      
      <div className="flex justify-end mb-4 space-x-3">
        <button 
          className={`btn flex items-center ${isLoading ? 'bg-secondary-200 opacity-70 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-primary-500 hover:from-blue-600 hover:to-primary-600 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1'}`}
          onClick={onRegenerate}
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
          className="btn flex items-center bg-secondary-100 text-secondary-700 hover:bg-secondary-200 border border-secondary-300 shadow-sm hover:shadow transition-all duration-200"
          onClick={onRevert}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          元に戻す
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium text-secondary-900 mb-3 pb-2 border-b border-secondary-200 flex items-center">
            <span className="bg-blue-100 text-blue-700 p-1.5 rounded-full mr-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
            既存フロー
          </h4>
          <div className="space-y-4">
            {originalSteps.map((step, index) => (
              <div key={`original-${step.id}`} className="bg-white border border-secondary-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center">
                  <span className="bg-secondary-100 text-secondary-700 p-1 rounded-full mr-2 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                  </span>
                  {step.title}
                </h3>
                <p className="text-secondary-600 mt-2 ml-7">{step.description}</p>
                <div className="flex flex-wrap items-center mt-3 gap-2 ml-7">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span className="font-medium">担当:</span> {step.assignee}
                  </div>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium">所要時間:</span> {step.timeRequired}分
                  </div>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium">コスト:</span> {step.cost !== undefined ? `${step.cost.toLocaleString()}円` : '未設定'}
                  </div>
                  {step.tools && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <span className="font-medium">ツール/設備:</span> {step.tools}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium text-secondary-900 mb-3 pb-2 border-b border-secondary-200 flex items-center">
            <span className="bg-green-100 text-green-700 p-1.5 rounded-full mr-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
            改善後フロー
          </h4>
          <div className="space-y-4">
            {improvedSteps.map((step, index) => {
              // 担当者が「自動化」の場合のスタイル
              const isAutomated = step.assignee === '自動化';
              
              // 担当者に応じたスタイルを設定
              const blockStyle = isAutomated 
                ? "bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 shadow-lg" 
                : "bg-white border border-secondary-200 shadow-md";
              
              // 担当者に応じたタイトルスタイル
              const titleStyle = isAutomated
                ? "text-lg font-bold text-purple-800"
                : "text-lg font-semibold text-secondary-900";
              
              // 担当者バッジのスタイル
              const assigneeBadgeStyle = isAutomated
                ? "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-sm"
                : "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800";
                
              return (
                <div key={`improved-${step.id}`} className={`relative rounded-lg p-4 transition-all duration-300 hover:shadow-xl ${blockStyle}`}>
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex-1">
                      <h3 className={titleStyle}>
                        {step.title}
                        {isAutomated && (
                          <span className="ml-2 inline-flex items-center">
                            <svg className="w-5 h-5 text-yellow-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
                            </svg>
                          </span>
                        )}
                      </h3>
                      <p className={`mt-2 ${isAutomated ? 'text-purple-700' : 'text-secondary-600'}`}>{step.description}</p>
                      <div className="flex flex-wrap items-center mt-3 gap-2">
                        <div className={assigneeBadgeStyle}>
                          {isAutomated && (
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="font-medium">担当:</span> {step.assignee}
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${isAutomated ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span className="font-medium">所要時間:</span> {step.timeRequired}分
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${isAutomated ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span className="font-medium">コスト:</span> {step.cost !== undefined ? `${step.cost.toLocaleString()}円` : '未設定'}
                        </div>
                        {step.tools && (
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${isAutomated ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span className="font-medium">ツール/設備:</span> {step.tools}
                          </div>
                        )}
                      </div>
                    </div>
                    {onEditStep && onDeleteStep && (
                      <div className="flex items-center mt-4 md:mt-0 space-x-2">
                        <button
                          onClick={() => {
                            setCurrentStep(step);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded-full hover:bg-secondary-200 transition-colors shadow-sm"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => onDeleteStep(step.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                  {isAutomated && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
            {onAddStep && (
              <div className="mt-6 text-center">
                <button 
                  className="btn bg-gradient-to-r from-blue-500 to-primary-500 hover:from-blue-600 hover:to-primary-600 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 flex items-center mx-auto"
                  onClick={() => {
                    setCurrentStep(null);
                    setIsModalOpen(true);
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  ステップを追加
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isModalOpen && onEditStep && onAddStep && (
        <WorkflowBlockModal
          step={currentStep}
          onSave={handleSaveStep}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
