'use client'

import React from 'react'

interface ChatMenuProps {
  onNewChat: () => void
  onShowMemoTitleInput: () => void
  onShowMemoList: () => void
  onShowTemplateList: () => void
  onShowShareModal?: () => void
}

export const ChatMenu: React.FC<ChatMenuProps> = ({
  onNewChat,
  onShowMemoTitleInput,
  onShowMemoList,
  onShowTemplateList,
  onShowShareModal
}) => {
  return (
    <div className="chat-menu bg-gray-50 border-b border-blue-100 p-2 flex items-center space-x-2 overflow-x-auto">
      {/* 新規チャット */}
      <div className="relative group" style={{ padding: '10px 0' }}>
        <button 
          className="w-14 h-14 rounded-full hover:bg-blue-100 text-primary-600 flex items-center justify-center cursor-pointer"
          style={{ minWidth: '56px', minHeight: '56px' }}
          onClick={onNewChat}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>
        <div className="absolute top-1/2 left-full ml-2 px-2 py-1 bg-primary-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap -translate-y-1/2 pointer-events-none">
          新規チャット
        </div>
      </div>
      
      {/* メモに保存 */}
      <div className="relative group" style={{ padding: '10px 0' }}>
        <button 
          className="w-14 h-14 rounded-full hover:bg-blue-100 text-primary-600 flex items-center justify-center cursor-pointer"
          style={{ minWidth: '56px', minHeight: '56px' }}
          onClick={onShowMemoTitleInput}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
        </button>
        <div className="absolute top-1/2 left-full ml-2 px-2 py-1 bg-primary-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap -translate-y-1/2 pointer-events-none">
          メモに保存
        </div>
      </div>
      
      {/* メモ */}
      <div className="relative group" style={{ padding: '10px 0' }}>
        <button 
          className="w-14 h-14 rounded-full hover:bg-blue-100 text-primary-600 flex items-center justify-center cursor-pointer"
          style={{ minWidth: '56px', minHeight: '56px' }}
          onClick={onShowMemoList}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div className="absolute top-1/2 left-full ml-2 px-2 py-1 bg-primary-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap -translate-y-1/2 pointer-events-none">
          メモ
        </div>
      </div>
      
      {/* テンプレート */}
      <div className="relative group" style={{ padding: '10px 0' }}>
        <button 
          className="w-14 h-14 rounded-full hover:bg-blue-100 text-primary-600 flex items-center justify-center cursor-pointer"
          style={{ minWidth: '56px', minHeight: '56px' }}
          onClick={onShowTemplateList}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </button>
        <div className="absolute top-1/2 left-full ml-2 px-2 py-1 bg-primary-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap -translate-y-1/2 pointer-events-none">
          テンプレート
        </div>
      </div>
      
      {/* 共有 */}
      <div className="relative group" style={{ padding: '10px 0' }}>
        <button 
          className="w-14 h-14 rounded-full hover:bg-blue-100 text-primary-600 flex items-center justify-center cursor-pointer"
          style={{ minWidth: '56px', minHeight: '56px' }}
          onClick={onShowShareModal}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
          </svg>
        </button>
        <div className="absolute top-1/2 left-full ml-2 px-2 py-1 bg-primary-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap -translate-y-1/2 pointer-events-none">
          共有
        </div>
      </div>
    </div>
  )
}
