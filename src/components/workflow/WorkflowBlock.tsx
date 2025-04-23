import React from 'react'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
  cost?: number
  tools?: string
}

interface WorkflowBlockProps {
  step: WorkflowStep
  onEdit: () => void
  onDelete: () => void
  onComplete?: () => void
  isCompleted?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  dragHandleProps?: any
}

export const WorkflowBlock: React.FC<WorkflowBlockProps> = ({ 
  step, 
  onEdit, 
  onDelete, 
  onComplete, 
  isCompleted = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  dragHandleProps
}) => {
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
    : "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800";

  return (
    <div className={`flex flex-col md:flex-row md:items-center p-4 rounded-lg transition-all duration-300 hover:shadow-xl ${blockStyle}`}>
      <div className="mr-3 flex flex-col items-center justify-center h-full" {...dragHandleProps}>
        <button 
          onClick={() => {
            if (!isFirst && onMoveUp) {
              onMoveUp();
              console.log('上に移動ボタンがクリックされました');
            }
          }}
          disabled={isFirst}
          className={`w-8 h-8 mb-1 flex items-center justify-center rounded-full ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-secondary-600 hover:bg-secondary-100'}`}
          title="上に移動"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
        <button 
          onClick={() => {
            if (!isLast && onMoveDown) {
              onMoveDown();
              console.log('下に移動ボタンがクリックされました');
            }
          }}
          disabled={isLast}
          className={`w-8 h-8 flex items-center justify-center rounded-full ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-secondary-600 hover:bg-secondary-100'}`}
          title="下に移動"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </button>
      </div>
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
        <div className="flex flex-wrap items-center mt-3 gap-3">
          <div className={assigneeBadgeStyle}>
            {isAutomated && (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">担当:</span> {step.assignee}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isAutomated ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium">所要時間:</span> {step.timeRequired}分
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isAutomated ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium">コスト:</span> {step.cost !== undefined ? `${step.cost.toLocaleString()}円` : '未設定'}
          </div>
          {step.tools && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isAutomated ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span className="font-medium">ツール/設備:</span> {step.tools}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center mt-4 md:mt-0 space-x-2">
        {onComplete && (
          <button
            onClick={onComplete}
            className={`px-3 py-1 text-sm rounded-full transition-colors shadow-sm ${
              isCompleted 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {isCompleted ? '完了済み' : '完了'}
          </button>
        )}
        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded-full hover:bg-secondary-200 transition-colors shadow-sm"
        >
          編集
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors shadow-sm"
        >
          削除
        </button>
      </div>
      {isAutomated && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}
