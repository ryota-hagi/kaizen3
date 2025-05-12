'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '../../../../components/layouts/DashboardLayout'
import { CollaboratorsManager } from '../../../../components/workflow/CollaboratorsManager'
import { ChatInterface } from '../../../../components/chat/ChatInterface'

export default function CollaboratorsPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string
  const [workflow, setWorkflow] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [companyName, setCompanyName] = useState('株式会社サンプル')
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  
  // 共同編集者リストを取得する関数
  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`/api/workflows/collaborators?workflowId=${workflowId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('Fetched collaborators:', data);
      setCollaborators(data);
    } catch (error) {
      console.error('共同編集者の取得エラー:', error);
    }
  };
  
  // 会社情報と従業員情報を取得
  useEffect(() => {
    // ローカルストレージから会社情報を取得
    const savedCompanyInfo = localStorage.getItem('kaizen_company_info')
    
    if (savedCompanyInfo) {
      try {
        const parsedCompanyInfo = JSON.parse(savedCompanyInfo)
        setCompanyInfo(parsedCompanyInfo)
        setCompanyName(parsedCompanyInfo.name || '株式会社サンプル')
      } catch (error) {
        console.error('会社情報の解析エラー:', error)
        // デフォルトの会社情報を設定
        const defaultCompanyInfo = {
          name: '株式会社サンプル',
          industry: 'IT',
          size: '50-100人',
          address: '東京都渋谷区',
          businessDescription: 'ビジネスプロセス改善ソリューションの提供'
        }
        setCompanyInfo(defaultCompanyInfo)
      }
    } else {
      // 会社情報がない場合はデフォルト値を設定
      const defaultCompanyInfo = {
        name: '株式会社サンプル',
        industry: 'IT',
        size: '50-100人',
        address: '東京都渋谷区',
        businessDescription: 'ビジネスプロセス改善ソリューションの提供'
      }
      setCompanyInfo(defaultCompanyInfo)
    }
    
    // ローカルストレージから従業員情報を取得
    const savedEmployees = localStorage.getItem('kaizen_employees')
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees)
        setEmployees(parsedEmployees)
      } catch (error) {
        console.error('従業員情報の解析エラー:', error)
        // デフォルトの従業員情報を設定
        const defaultEmployees = [
          {
            id: '1',
            name: '山田太郎',
            position: '営業部長',
            department: '営業部',
            hourlyRate: 3000
          }
        ]
        setEmployees(defaultEmployees)
      }
    } else {
      // 従業員情報がない場合はデフォルト値を設定
      const defaultEmployees = [
        {
          id: '1',
          name: '山田太郎',
          position: '営業部長',
          department: '営業部',
          hourlyRate: 3000
        }
      ]
      setEmployees(defaultEmployees)
    }
  }, [])
  
  // 初期表示時に共同編集者リストを取得
  useEffect(() => {
    if (workflowId) {
      fetchCollaborators();
    }
  }, [workflowId]);
  
  useEffect(() => {
    // ローカルストレージからワークフローを取得
    const loadWorkflows = async () => {
      try {
        // まずSupabaseからワークフローを取得
        const response = await fetch(`/api/workflows?id=${workflowId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setWorkflow(data[0]);
            setLoading(false);
            return;
          }
        }
        
        // Supabaseから取得できない場合はローカルストレージを試す
        const storedWorkflows = localStorage.getItem('workflows')
        if (storedWorkflows) {
          try {
            const parsedWorkflows = JSON.parse(storedWorkflows)
            // 指定されたIDのワークフローを検索
            const foundWorkflow = parsedWorkflows.find((wf: any) => wf.id === workflowId)
            
            if (foundWorkflow) {
              setWorkflow(foundWorkflow)
            } else {
              // ダミーのワークフローを作成（エラー回避のため）
              const dummyWorkflow = {
                id: workflowId,
                name: "ワークフロー",
                description: "詳細情報を取得できませんでした",
                createdAt: new Date(),
                updatedAt: new Date(),
                steps: [],
                accessLevel: "user"
              };
              setWorkflow(dummyWorkflow);
            }
          } catch (error) {
            console.error('ワークフローの解析エラー:', error)
            // エラー時もダミーのワークフローを設定
            const dummyWorkflow = {
              id: workflowId,
              name: "ワークフロー",
              description: "詳細情報を取得できませんでした",
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: [],
              accessLevel: "user"
            };
            setWorkflow(dummyWorkflow);
          }
        } else {
          // ワークフローがない場合もダミーのワークフローを設定
          const dummyWorkflow = {
            id: workflowId,
            name: "ワークフロー",
            description: "詳細情報を取得できませんでした",
            createdAt: new Date(),
            updatedAt: new Date(),
            steps: [],
            accessLevel: "user"
          };
          setWorkflow(dummyWorkflow);
        }
      } catch (error) {
        console.error('ワークフロー取得エラー:', error);
        // エラー時もダミーのワークフローを設定
        const dummyWorkflow = {
          id: workflowId,
          name: "ワークフロー",
          description: "詳細情報を取得できませんでした",
          createdAt: new Date(),
          updatedAt: new Date(),
          steps: [],
          accessLevel: "user"
        };
        setWorkflow(dummyWorkflow);
      }
      
      setLoading(false)
    }
    
    loadWorkflows()
  }, [workflowId, router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">読み込み中...</h1>
          <p className="text-secondary-600">業務フロー情報を取得しています</p>
        </div>
      </div>
    )
  }
  
  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">業務フローが見つかりません</h1>
          <p className="text-secondary-600">
            指定された業務フローは存在しないか、削除された可能性があります。
            <br />
            <button 
              onClick={() => router.push('/')}
              className="text-primary-600 hover:text-primary-700 underline mt-2"
            >
              ホームに戻る
            </button>
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <DashboardLayout companyName={companyName}>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <button 
              onClick={() => router.push('/')}
              className="text-sm text-secondary-500 hover:text-secondary-700 mb-2 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              <span>ホームへ戻る</span>
            </button>
            <h1 className="text-2xl font-bold text-secondary-900">{workflow.name}</h1>
            <p className="text-secondary-600">{workflow.description}</p>
          </div>
          
          {/* 共同編集者管理セクション */}
          <CollaboratorsManager
            workflowId={workflow.id}
            createdBy={workflow.createdBy || ''}
            accessLevel={workflow.accessLevel || 'user'}
            onAccessLevelChange={async (newLevel) => {
              try {
                // ローカルストレージからワークフローを取得
                const storedWorkflows = localStorage.getItem('workflows');
                if (storedWorkflows) {
                  const parsedWorkflows = JSON.parse(storedWorkflows);
                  const index = parsedWorkflows.findIndex((wf: any) => wf.id === workflow.id);
                  if (index !== -1) {
                    parsedWorkflows[index].accessLevel = newLevel;
                    localStorage.setItem('workflows', JSON.stringify(parsedWorkflows));
                    
                    // 状態を更新
                    setWorkflow({
                      ...workflow,
                      accessLevel: newLevel
                    });
                    return true;
                  }
                }
                return false;
              } catch (error) {
                console.error('アクセスレベル更新エラー:', error);
                return false;
              }
            }}
            onAddCollaborator={async (userId, permissionType) => {
              try {
                // APIを呼び出して共同編集者を追加
                const response = await fetch('/api/workflows/collaborators', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    workflowId: workflow.id,
                    userId,
                    permissionType
                  }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  console.error('API response error:', errorData);
                  throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                }
                
                const result = await response.json();
                console.log('Added collaborator:', result);
                
                // 共同編集者リストを再取得
                fetchCollaborators();
                
                return true;
              } catch (error) {
                console.error('共同編集者追加エラー:', error);
                alert(`共同編集者の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
                return false;
              }
            }}
            onRemoveCollaborator={async (collaboratorId) => {
              try {
                // APIを呼び出して共同編集者を削除
                const response = await fetch(`/api/workflows/collaborators?id=${collaboratorId}`, {
                  method: 'DELETE',
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  console.error('API response error:', errorData);
                  throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                }
                
                const result = await response.json();
                console.log('Removed collaborator:', result);
                
                // 共同編集者リストを再取得
                fetchCollaborators();
                
                return true;
              } catch (error) {
                console.error('共同編集者削除エラー:', error);
                alert(`共同編集者の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
                return false;
              }
            }}
            collaborators={collaborators}
          />
          
          <div className="mt-6 flex justify-end">
            <Link 
              href={`/workflows/${workflowId}`}
              className="btn btn-primary"
            >
              業務フロー詳細に戻る
            </Link>
          </div>
        </div>

        {/* チャットアイコン */}
        <button
          className="fixed right-6 bottom-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-all duration-200 z-50"
          onClick={() => setChatExpanded(!chatExpanded)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </button>
        
        {/* チャットインターフェース */}
        {chatExpanded && (
          <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-secondary-200 shadow-lg z-40 transition-all duration-300 ease-in-out">
            <button
              className="absolute top-4 right-4 text-secondary-500 hover:text-secondary-700"
              onClick={() => setChatExpanded(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <div className="h-full pt-14">
              <ChatInterface 
                companyInfo={companyInfo}
                employees={employees}
                workflowContext={{
                  id: workflow.id,
                  name: workflow.name,
                  description: workflow.description,
                  steps: workflow.steps,
                  isImproved: workflow.isImproved,
                  originalId: workflow.originalId
                }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
