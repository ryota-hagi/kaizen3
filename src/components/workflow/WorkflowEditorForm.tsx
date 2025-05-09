'use client'

import React from 'react'

interface WorkflowEditorFormProps {
  workflowName: string
  workflowDescription: string
  setWorkflowName: (name: string) => void
  setWorkflowDescription: (description: string) => void
  accessLevel?: string
  setAccessLevel?: (level: string) => void
}

export const WorkflowEditorForm: React.FC<WorkflowEditorFormProps> = ({
  workflowName,
  workflowDescription,
  setWorkflowName,
  setWorkflowDescription,
  accessLevel = 'user',
  setAccessLevel
}) => {
  return (
    <div className="mb-6 space-y-4 bg-white p-5 rounded-lg shadow-inner border border-blue-100">
      <div>
        <label htmlFor="workflowName" className="block text-sm font-medium text-secondary-700 mb-1 flex items-center">
          <svg className="w-5 h-5 mr-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          フロー名
        </label>
        <input
          type="text"
          id="workflowName"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all duration-200"
          required
        />
      </div>
      
      <div>
        <label htmlFor="workflowDescription" className="block text-sm font-medium text-secondary-700 mb-1 flex items-center">
          <svg className="w-5 h-5 mr-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
          </svg>
          説明
        </label>
        <textarea
          id="workflowDescription"
          value={workflowDescription}
          onChange={(e) => setWorkflowDescription(e.target.value)}
          className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all duration-200"
          rows={2}
        />
      </div>

      {setAccessLevel && (
        <div>
          <label htmlFor="accessLevel" className="block text-sm font-medium text-secondary-700 mb-1 flex items-center">
            <svg className="w-5 h-5 mr-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            アクセスレベル
          </label>
          <select
            id="accessLevel"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all duration-200"
          >
            <option value="user">個人用</option>
            <option value="department">部署内共有</option>
            <option value="company">全社共有</option>
          </select>
          <p className="mt-1 text-xs text-secondary-500">
            個人用: 自分だけが閲覧・編集できます / 部署内共有: 同じ部署のメンバーが閲覧できます / 全社共有: 会社全体で閲覧できます
          </p>
        </div>
      )}
    </div>
  )
}
