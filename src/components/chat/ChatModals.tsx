'use client'

import React from 'react'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

interface MemoItem {
  title: string
  content: Message[]
  timestamp: Date
}

interface TemplateItem {
  id: string
  title: string
  content: string
}

interface ChatModalsProps {
  showMemoTitleInput: boolean
  memoTitle: string
  setMemoTitle: (title: string) => void
  onCloseMemoTitleInput: () => void
  onSaveMemo: () => void
  showMemoList: boolean
  savedMemos: MemoItem[]
  onCloseMemoList: () => void
  onSelectMemo: (memo: MemoItem) => void
  showTemplateList: boolean
  templates: TemplateItem[]
  onCloseTemplateList: () => void
  onSelectTemplate: (template: TemplateItem) => void
  showShareModal?: boolean
  onCloseShareModal?: () => void
  onCopyAsText?: () => void
  onCopyAsMarkdown?: () => void
}

export const ChatModals: React.FC<ChatModalsProps> = ({
  showMemoTitleInput,
  memoTitle,
  setMemoTitle,
  onCloseMemoTitleInput,
  onSaveMemo,
  showMemoList,
  savedMemos,
  onCloseMemoList,
  onSelectMemo,
  showTemplateList,
  templates,
  onCloseTemplateList,
  onSelectTemplate,
  showShareModal,
  onCloseShareModal,
  onCopyAsText,
  onCopyAsMarkdown
}) => {
  return (
    <>
      {/* メモタイトル入力モーダル */}
      {showMemoTitleInput && (
        <div className="absolute top-24 left-0 right-0 mx-auto w-80 bg-white rounded-lg shadow-lg z-50 p-4 border border-blue-200">
          <h3 className="text-lg font-semibold text-secondary-900 mb-3">メモのタイトルを入力</h3>
          <input
            type="text"
            value={memoTitle}
            onChange={(e) => setMemoTitle(e.target.value)}
            placeholder="タイトルを入力..."
            className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCloseMemoTitleInput}
              className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              キャンセル
            </button>
            <button
              onClick={onSaveMemo}
              disabled={!memoTitle.trim()}
              className={`px-4 py-2 rounded-md ${
                !memoTitle.trim()
                  ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* メモ一覧モーダル */}
      {showMemoList && (
        <div className="absolute top-24 left-0 right-0 mx-auto w-80 bg-white rounded-lg shadow-lg z-50 p-4 border border-blue-200 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-secondary-900">保存したメモ</h3>
            <button
              onClick={onCloseMemoList}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          {savedMemos.length === 0 ? (
            <p className="text-center text-secondary-500 py-4">保存されているメモはありません</p>
          ) : (
            <ul className="space-y-2">
              {savedMemos.map((memo, index) => (
                <li key={index}>
                  <button
                    onClick={() => onSelectMemo(memo)}
                    className="w-full text-left p-3 rounded-md hover:bg-blue-50 transition-colors duration-200 flex justify-between items-center"
                  >
                    <span className="font-medium text-secondary-800">{memo.title}</span>
                    <span className="text-xs text-secondary-500">
                      {new Date(memo.timestamp).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* テンプレート一覧モーダル */}
      {showTemplateList && (
        <div className="absolute top-24 left-0 right-0 mx-auto w-80 bg-white rounded-lg shadow-lg z-50 p-4 border border-blue-200 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-secondary-900">テンプレート</h3>
            <button
              onClick={onCloseTemplateList}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          {templates.length === 0 ? (
            <p className="text-center text-secondary-500 py-4">テンプレートがありません</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    onClick={() => onSelectTemplate(template)}
                    className="w-full text-left p-3 rounded-md hover:bg-blue-50 transition-colors duration-200"
                  >
                    <span className="font-medium text-secondary-800">{template.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* 共有モーダル */}
      {showShareModal && (
        <div className="absolute top-24 left-0 right-0 mx-auto w-80 bg-white rounded-lg shadow-lg z-50 p-4 border border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-secondary-900">チャットを共有</h3>
            <button
              onClick={onCloseShareModal}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={onCopyAsText}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center text-left transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
              </svg>
              <div>
                <span className="font-medium text-secondary-900 block">テキストとしてコピー</span>
                <span className="text-xs text-secondary-500">シンプルなテキスト形式でコピーします</span>
              </div>
            </button>
            
            <button
              onClick={onCopyAsMarkdown}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center text-left transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <div>
                <span className="font-medium text-secondary-900 block">Markdownとしてコピー</span>
                <span className="text-xs text-secondary-500">整形されたMarkdown形式でコピーします</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
