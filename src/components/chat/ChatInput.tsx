'use client'

import React, { useState, useRef } from 'react'

interface ChatInputProps {
  input: string
  setInput: (input: string) => void
  handleSendMessage: () => void
  isLoading: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSendMessage,
  isLoading
}) => {
  // Enter2回押しの検出用
  const [enterPressed, setEnterPressed] = useState(false)
  const enterPressedTimer = useRef<NodeJS.Timeout | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      if (enterPressed) {
        // 2回目のEnterが押された場合、メッセージを送信
        handleSendMessage()
        setEnterPressed(false)
        if (enterPressedTimer.current) {
          clearTimeout(enterPressedTimer.current)
        }
      } else {
        // 1回目のEnterが押された場合、フラグを立てる
        setEnterPressed(true)
        
        // 一定時間後にフラグをリセット（ダブルEnterの検出時間枠）
        enterPressedTimer.current = setTimeout(() => {
          setEnterPressed(false)
        }, 500) // 500ミリ秒以内に2回目のEnterが押されなければリセット
      }
    }
  }

  return (
    <div className="chat-input bg-white border-t border-blue-100 p-4 rounded-b-lg shadow-inner">
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="w-full p-3 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none shadow-sm transition-all duration-200 bg-white"
            rows={3}
          />
          {/* AIラベルを削除しました */}
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          className={`px-4 py-2 rounded-lg shadow-md flex items-center justify-center min-w-[80px] ${
            !input.trim() || isLoading
              ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary-500 to-blue-600 text-white hover:from-primary-600 hover:to-blue-700 transform transition-all duration-200 hover:-translate-y-1'
          }`}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          送信
        </button>
      </div>
      <div className="flex justify-center items-center mt-2">
        <p className="text-xs text-secondary-500">Enterキーを2回押して送信、Shift+Enterで改行</p>
      </div>
    </div>
  )
}
