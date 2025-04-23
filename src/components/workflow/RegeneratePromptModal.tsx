import React, { useState } from 'react'

interface RegeneratePromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void
  defaultPrompt?: string
}

export const RegeneratePromptModal: React.FC<RegeneratePromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultPrompt = ''
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(prompt)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">
          再提案の指示
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="prompt" className="block text-sm font-medium text-secondary-700 mb-1">
              Claudeへの指示
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={6}
              placeholder="例: 自動化をより重視した改善案を提案してください。または、コスト削減に焦点を当てた改善案を提案してください。"
              required
            />
            <p className="text-xs text-secondary-500 mt-1">
              この指示はClaudeに送信され、指示に基づいた改善案が生成されます。
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
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
