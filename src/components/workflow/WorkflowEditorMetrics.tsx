'use client'

import React from 'react'
import { WorkflowStep } from './WorkflowEditorHelpers'

interface WorkflowEditorMetricsProps {
  originalSteps: WorkflowStep[]
  improvedSteps: WorkflowStep[]
}

export const WorkflowEditorMetrics: React.FC<WorkflowEditorMetricsProps> = ({
  originalSteps,
  improvedSteps
}) => {
  // 総所要時間とコストの計算
  const originalTotalTime = originalSteps.reduce((total, step) => total + step.timeRequired, 0)
  const improvedTotalTime = improvedSteps.reduce((total, step) => total + step.timeRequired, 0)
  const timeSaved = originalTotalTime - improvedTotalTime
  
  // コストの計算
  const originalTotalCost = originalSteps.reduce((total, step) => total + (step.cost || 0), 0)
  const improvedTotalCost = improvedSteps.reduce((total, step) => total + (step.cost || 0), 0)
  const costSaved = originalTotalCost - improvedTotalCost

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-md">
      <h4 className="text-lg font-bold text-green-800 mb-3 flex items-center">
        <span className="bg-green-100 text-green-700 p-1.5 rounded-full mr-2 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </span>
        改善効果
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 時間関連の情報をグループ化 */}
        <div className="bg-white rounded-lg shadow-sm border border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-sm font-medium text-blue-700">時間効率</p>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">元の所要時間</span>
              <span className="text-sm font-semibold text-gray-700">{originalTotalTime}分</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">改善後の所要時間</span>
              <span className="text-sm font-semibold text-gray-700">{improvedTotalTime}分</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full mt-2 mb-1">
              <div 
                className="h-2 bg-blue-500 rounded-full" 
                style={{ width: `${100 - Math.round((improvedTotalTime / originalTotalTime) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-medium text-blue-600">削減時間</span>
              <div className="flex items-center">
                <span className="text-base font-bold text-blue-700">{timeSaved}分</span>
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {Math.round((timeSaved / originalTotalTime) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* コスト関連の情報をグループ化 */}
        <div className="bg-white rounded-lg shadow-sm border border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-sm font-medium text-green-700">コスト効率</p>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">元のコスト</span>
              <span className="text-sm font-semibold text-gray-700">{originalTotalCost.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">改善後のコスト</span>
              <span className="text-sm font-semibold text-gray-700">{improvedTotalCost.toLocaleString()}円</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full mt-2 mb-1">
              <div 
                className="h-2 bg-green-500 rounded-full" 
                style={{ width: `${originalTotalCost > 0 ? 100 - Math.round((improvedTotalCost / originalTotalCost) * 100) : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-medium text-green-600">コスト削減</span>
              <div className="flex items-center">
                <span className="text-base font-bold text-green-700">{costSaved.toLocaleString()}円</span>
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {originalTotalCost > 0 ? Math.round((costSaved / originalTotalCost) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 自動化関連の情報 */}
        <div className="bg-white rounded-lg shadow-sm border border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <p className="text-sm font-medium text-purple-700">自動化効果</p>
            </div>
          </div>
          <div className="p-3">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-purple-100 text-purple-700 rounded-full mr-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-gray-700">自動化ステップ</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-purple-700">
                    {improvedSteps.filter(step => step.assignee === '自動化').length}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">/ {improvedSteps.length}</span>
                </div>
              </div>
              
              {/* バーチャート */}
              <div className="mt-2 mb-3">
                <div className="relative pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                        自動化率
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-purple-600">
                        {improvedSteps.length > 0 
                          ? Math.round((improvedSteps.filter(step => step.assignee === '自動化').length / improvedSteps.length) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mt-1 text-xs flex rounded bg-purple-100">
                    <div 
                      style={{ width: `${improvedSteps.length > 0 
                        ? Math.round((improvedSteps.filter(step => step.assignee === '自動化').length / improvedSteps.length) * 100) 
                        : 0}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-1">
                <div className="flex items-center bg-purple-50 px-3 py-1 rounded-full">
                  <svg className="w-4 h-4 text-purple-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                  </svg>
                  <span className="text-xs font-medium text-purple-700">効率化されたプロセス</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 総合効果のサマリー */}
      <div className="mt-3 bg-gradient-to-r from-green-100 to-blue-100 p-3 rounded-lg shadow-sm border border-green-200">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">総合改善効果</p>
              <p className="text-xs text-green-700">時間・コスト・自動化の総合評価</p>
            </div>
          </div>
          <div className="flex items-center mt-2 sm:mt-0">
            <div className="flex items-center mr-4">
              <svg className="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="text-xs text-blue-700">時間</p>
                <p className="text-sm font-bold text-blue-800">{Math.round((timeSaved / originalTotalTime) * 100)}%減</p>
              </div>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="text-xs text-green-700">コスト</p>
                <p className="text-sm font-bold text-green-800">{originalTotalCost > 0 ? Math.round((costSaved / originalTotalCost) * 100) : 0}%減</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
