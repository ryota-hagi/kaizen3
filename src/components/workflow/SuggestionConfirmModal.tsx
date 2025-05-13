'use client'

import React from 'react'
import { WorkflowStep } from './WorkflowEditorHelpers'

interface SuggestionConfirmModalProps {
  suggestedSteps: WorkflowStep[]
  onAdopt: () => void
  onRegenerate: () => void
  onCancel: () => void
  isLoading?: boolean
}

export const SuggestionConfirmModal: React.FC<SuggestionConfirmModalProps> = ({
  suggestedSteps,
  onAdopt,
  onRegenerate,
  onCancel,
  isLoading = false
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">
          提案されたワークフローステップ
        </h2>
        
        <div className="mb-6">
          <p className="text-secondary-700 mb-4">
            以下のステップが提案されました。この内容を採用しますか？
          </p>
          
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <span className="ml-3 text-secondary-700">生成中...</span>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto p-4 bg-gray-50 rounded-lg">
              {suggestedSteps.map((step, index) => (
                <div key={index} className="border border-secondary-200 rounded-lg p-4 bg-white">
                  <h3 className="text-lg font-semibold text-secondary-900">{step.title}</h3>
                  <p className="mt-2 text-secondary-600">{step.description}</p>
                  <div className="flex flex-wrap items-center mt-3 gap-2">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800">
                      <span className="font-medium">担当:</span> {step.assignee}
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <span className="font-medium">所要時間:</span> {step.timeRequired}分
                    </div>
                    {step.tools && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <span className="font-medium">ツール:</span> {step.tools}
                      </div>
                    )}
                    {step.cost !== undefined && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <span className="font-medium">コスト:</span> {step.cost}円
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            再作成
          </button>
          <button
            type="button"
            onClick={onAdopt}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          >
            採用
          </button>
        </div>
      </div>
    </div>
  )
}
