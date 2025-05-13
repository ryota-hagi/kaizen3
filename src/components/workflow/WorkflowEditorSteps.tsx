'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { WorkflowStep } from './WorkflowEditorHelpers'
import { WorkflowBlock } from './WorkflowBlock'

// react-beautiful-dndをクライアントサイドのみでインポート
const DragDropContext = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.DragDropContext),
  { ssr: false }
)
const Droppable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Droppable),
  { ssr: false }
)
const Draggable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Draggable),
  { ssr: false }
)

interface WorkflowEditorStepsProps {
  steps: WorkflowStep[]
  onAddStep: () => void
  onEditStep: (step: WorkflowStep) => void
  onDeleteStep: (stepId: string) => void
  onReorderSteps: (sourceIndex: number, destinationIndex: number) => void
  onSupportButtonClick?: () => void
}

export const WorkflowEditorSteps: React.FC<WorkflowEditorStepsProps> = ({
  steps,
  onAddStep,
  onEditStep,
  onDeleteStep,
  onReorderSteps,
  onSupportButtonClick
}) => {
  // ドラッグ＆ドロップの処理
  const handleDragEnd = (result: any) => {
    console.log('handleDragEnd called', result)
    if (!result.destination) return

    onReorderSteps(result.source.index, result.destination.index)
  }

  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-secondary-900 flex items-center">
          <span className="bg-secondary-100 text-secondary-700 p-2 rounded-full mr-2 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </span>
          ステップ
        </h3>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="workflow-steps" direction="vertical">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300"
              style={{ minHeight: '100px' }}
            >
              {steps.length === 0 ? (
                <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200">
                  <svg className="w-16 h-16 mx-auto text-blue-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-secondary-600 font-medium mb-2">ステップがありません</p>
                  <p className="text-secondary-500 mb-4">下部の「ステップを追加」ボタンをクリックして業務フローを作成してください。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <Draggable 
                      key={`draggable-${index}`} 
                      draggableId={step.id} 
                      index={index}
                    >
                      {(provided) => (
                          <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="relative border border-secondary-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                          style={{...provided.draggableProps.style}}
                        >
                          <WorkflowBlock
                            step={step}
                            onEdit={() => onEditStep(step)}
                            onDelete={() => onDeleteStep(step.id)}
                            dragHandleProps={provided.dragHandleProps}
                            onMoveUp={() => onReorderSteps(index, index - 1)}
                            onMoveDown={() => onReorderSteps(index, index + 1)}
                            isFirst={index === 0}
                            isLast={index === steps.length - 1}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
              <div className="mt-6 text-center flex justify-center space-x-3">
                <button 
                  className="btn bg-gradient-to-r from-blue-500 to-primary-500 hover:from-blue-600 hover:to-primary-600 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 flex items-center"
                  onClick={onAddStep}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  ステップを追加
                </button>
                
                <button 
                  className="btn bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 flex items-center"
                  onClick={onSupportButtonClick}
                  title="AIによる入力補助"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  入力補助
                </button>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  )
}
