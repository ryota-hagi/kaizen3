'use client'

import React, { useState } from 'react'
import { WorkflowStep } from './WorkflowEditorHelpers'

interface WorkflowSupportModalProps {
  isOpen: boolean
  onClose: () => void
  onAdopt: (steps: WorkflowStep[]) => void
  onRegenerate: (prompt: string) => void
  suggestedSteps: WorkflowStep[]
  isLoading: boolean
  isSubdividing?: boolean
  subdivideStepTitle?: string
}

export const WorkflowSupportModal: React.FC<WorkflowSupportModalProps> = ({
  isOpen,
  onClose,
  onAdopt,
  onRegenerate,
  suggestedSteps,
  isLoading,
  isSubdividing = false,
  subdivideStepTitle = ''
}) => {
  const [regeneratePrompt, setRegeneratePrompt] = useState('')
  const [showRegenerateForm, setShowRegenerateForm] = useState(false)

  if (!isOpen) return null

  const handleAdopt = () => {
    onAdopt(suggestedSteps)
  }

  const handleRegenerate = () => {
    if (showRegenerateForm) {
      onRegenerate(regeneratePrompt)
      setShowRegenerateForm(false)
      setRegeneratePrompt('')
    } else {
      setShowRegenerateForm(true)
    }
  }

  const handleCancel = () => {
    setShowRegenerateForm(false)
    setRegeneratePrompt('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">
          {isSubdividing ? 'AIによるステップ細分化' : 'AIによる業務フロー提案'}
        </h2>
        
        <div className="mb-6">
          <p className="text-secondary-700 mb-4">
            {isSubdividing 
              ? `「${subdivideStepTitle}」を細分化した結果です。この内容を採用しますか？` 
              : '以下の業務フローが提案されました。この内容を採用しますか？'}
          </p>
          
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <span className="ml-3 text-secondary-700">生成中...</span>
            </div>
          ) : showRegenerateForm ? (
            <div className="mb-6">
              <label htmlFor="regeneratePrompt" className="block text-sm font-medium text-secondary-700 mb-1">
                どのように改善してほしいですか？
              </label>
              <textarea
                id="regeneratePrompt"
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={5}
                placeholder="例: もっと詳細なステップが欲しい、自動化できる部分を増やしてほしい、など"
                required
              />
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
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {showRegenerateForm ? '送信' : '再作成'}
          </button>
          {!showRegenerateForm && (
            <button
              type="button"
              onClick={handleAdopt}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading || suggestedSteps.length === 0}
            >
              採用
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
