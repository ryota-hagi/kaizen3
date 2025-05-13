'use client'

import React, { useState } from 'react'

interface RegenerateStepsPromptModalProps {
  onSubmit: (prompt: string) => void
  onCancel: () => void
  defaultPrompt?: string
}

export const RegenerateStepsPromptModal: React.FC<RegenerateStepsPromptModalProps> = ({
  onSubmit,
  onCancel,
  defaultPrompt = ''
}) => {
  const [additionalPrompt, setAdditionalPrompt] = useState(defaultPrompt)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(additionalPrompt)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">
          再作成の要望を入力
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="additionalPrompt" className="block text-sm font-medium text-secondary-700 mb-1">
              どのように改善してほしいですか？
            </label>
            <textarea
              id="additionalPrompt"
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={5}
              placeholder="例: もっと詳細なステップが欲しい、自動化できる部分を増やしてほしい、など"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
