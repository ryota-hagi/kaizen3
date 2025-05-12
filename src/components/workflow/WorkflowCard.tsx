'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
}

interface Workflow {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  steps: WorkflowStep[]
  isImproved?: boolean
  originalId?: string
  isCompleted?: boolean
  completedAt?: Date
  createdBy?: string
  company_id?: string
  collaborators?: any[]
}

interface WorkflowCardProps {
  workflow: Workflow
  improved: boolean
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onToggleCompletion: (id: string, isCompleted: boolean) => Promise<void>
  getUserById?: (id: string) => any
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ 
  workflow, 
  improved, 
  onDelete, 
  onEdit, 
  onToggleCompletion,
  getUserById
}) => {
  const router = useRouter()

  if (!workflow) return null

  return (
      <div className="bg-white rounded-lg shadow-md border border-secondary-200 overflow-hidden">
      {/* カードヘッダー */}
      <div className="px-4 py-3">
        <div className="flex justify-between items-start">
          <Link 
            href={`/workflows/${workflow.id}`}
            className="font-medium text-secondary-900 hover:text-primary-600"
          >
            {workflow.name}
          </Link>
          {improved && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              改善案あり
            </span>
          )}
        </div>
        <p className="text-sm text-secondary-600 mt-1 line-clamp-2">{workflow.description}</p>
      </div>
      
      {/* カード情報 */}
      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-primary-600 bg-primary-50 py-1 px-3 rounded-md">
            {workflow.steps?.length || 0}ステップ
          </div>
          <div className="text-sm text-secondary-600">
            {workflow.updatedAt.toLocaleDateString('ja-JP')}
          </div>
        </div>
        
        {/* 作成者と共同編集者 */}
        <div className="flex items-center mt-3">
          {/* 作成者 */}
          {workflow.createdBy && getUserById && getUserById(workflow.createdBy) ? (
            <div className="flex items-center group relative">
              <div className="flex-shrink-0 h-8 w-8 shadow-sm rounded-full border border-secondary-200 z-10">
                {getUserById(workflow.createdBy)?.profileImage ? (
                  <img
                    className="h-full w-full rounded-full object-cover"
                    src={getUserById(workflow.createdBy)?.profileImage}
                    alt={`${getUserById(workflow.createdBy)?.fullName}のプロフィール画像`}
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                    {getUserById(workflow.createdBy)?.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-secondary-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <p className="font-medium">{getUserById(workflow.createdBy)?.fullName}</p>
                <p>作成者</p>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-200 flex items-center justify-center text-secondary-500 shadow-sm border border-secondary-200 z-10">
              <span className="text-xs">?</span>
            </div>
          )}
          
          {/* 共同編集者 */}
          {(() => {
            // 共同編集者情報を取得
            const collaborators = workflow.collaborators || [];
            
            if (collaborators.length > 0) {
              // 最大3人まで表示
              const displayCollaborators = collaborators.slice(0, 3);
              const remainingCount = collaborators.length - 3;
              
              return (
                <div className="flex -ml-2">
                  {displayCollaborators.map((collab: any, index: number) => (
                    <div key={collab.id} className="group relative" style={{ zIndex: 10 - index }}>
                      {collab.full_name ? (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full border border-secondary-200 shadow-sm -ml-1">
                          <div className="h-full w-full rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                            {collab.full_name.charAt(0)}
                          </div>
                        </div>
                      ) : null}
                      <div className="absolute bottom-full left-0 mb-2 w-40 bg-secondary-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <p className="font-medium">{collab.full_name}</p>
                        <p>共同編集者</p>
                      </div>
                    </div>
                  ))}
                  
                  {remainingCount > 0 && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-200 border border-secondary-200 shadow-sm flex items-center justify-center text-secondary-700 text-xs font-medium -ml-1">
                      +{remainingCount}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <div className="ml-2">
                <button 
                  onClick={() => router.push(`/workflows/${workflow.id}/collaborators`)}
                  className="text-primary-600 hover:text-primary-800 text-xs font-medium bg-primary-50 hover:bg-primary-100 rounded-md px-2 py-1 transition-colors duration-150"
                >
                  + 共同編集者を追加
                </button>
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* カードアクション */}
      <div className="px-4 py-3 bg-secondary-50 flex justify-between">
        <button
          onClick={async () => {
            await onToggleCompletion(workflow.id, !workflow.isCompleted);
          }}
          className={`${
            workflow.isCompleted 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-primary-600 text-white hover:bg-primary-700'
          } px-3 py-2 text-sm font-medium rounded-md flex-1 mr-2 transition-colors duration-150`}
        >
          {workflow.isCompleted ? '完了済み' : '完了'}
        </button>
        <button
          onClick={() => onEdit(workflow.id)}
          className="bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-2 text-sm font-medium rounded-md flex-1 mr-2 transition-colors duration-150"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(workflow.id)}
          className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 text-sm font-medium rounded-md flex-1 transition-colors duration-150"
        >
          削除
        </button>
      </div>
    </div>
  )
}

export default WorkflowCard
