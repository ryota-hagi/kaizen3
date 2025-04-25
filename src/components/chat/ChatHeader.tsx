'use client'

import React from 'react'

interface ChatHeaderProps {
  onClose: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose, isExpanded, onToggleExpand }) => {
  return (
    <div className="chat-header bg-white border-b border-blue-100 p-4 rounded-t-lg shadow-sm">
      <div className="flex items-center">
        <button 
          onClick={onToggleExpand}
          className="p-2 rounded-full bg-primary-100 hover:bg-primary-200 mr-2 shadow-sm"
          title={isExpanded ? "チャットを縮小" : "チャットを拡大"}
        >
          <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            )}
          </svg>
        </button>
        <span className="bg-primary-100 text-primary-700 p-2 rounded-full mr-3 shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-bold text-secondary-900">Kaizen アシスタント</h2>
          <p className="text-sm text-secondary-500">業務改善のサポートをします</p>
        </div>
        <button 
          onClick={onClose}
          className="ml-auto p-2 rounded-full hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  )
}
