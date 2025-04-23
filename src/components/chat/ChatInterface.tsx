'use client'

import React, { useState, useRef, useEffect, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { WorkflowContext, WorkflowContextProvider } from '../../contexts/WorkflowContext'
import { callClaudeAPI } from '../../utils/api'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

import { CompanyInfo, Employee, WorkflowContext as WorkflowContextType } from '../../utils/api'

interface ChatInterfaceProps {
  standalone?: boolean
  companyInfo?: CompanyInfo
  employees?: Employee[]
  workflowContext?: WorkflowContextType
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  standalone = false,
  companyInfo,
  employees,
  workflowContext
}) => {
  // コンポーネントマウント時にpropsをログ出力
  useEffect(() => {
    console.log('=== ChatInterface Props ===');
    console.log('Company Info Type:', companyInfo ? typeof companyInfo : 'undefined');
    console.log('Company Info:', companyInfo);
    console.log('Employees Type:', employees ? typeof employees : 'undefined');
    console.log('Employees:', employees);
    console.log('Workflow Context Type:', workflowContext ? typeof workflowContext : 'undefined');
    console.log('Workflow Context:', workflowContext);
  }, [companyInfo, employees, workflowContext]);
  const router = useRouter()
  const pathname = usePathname()
  const { 
    currentWorkflow, 
    updateWorkflow, 
    improveWorkflow, 
    saveWorkflow,
    addStep,
    deleteStep,
    editStep
  } = useContext(WorkflowContext)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // ワークフロー関連のコマンドを検出
      const improveCommand = /このフロー(の)?改善案を(出して|表示して|教えて)/i.test(input)
      const addStepCommand = /(ステップ|ブロック)を追加して/i.test(input)
      const saveCommand = /(フロー|ワークフロー)を保存して/i.test(input)
      const navigateCommand = /(ダッシュボード|業務フロー一覧|マイページ)(に|へ)(移動|遷移|行って)/i.test(input)
      
      // ワークフロー関連のコマンドを処理
      if (improveCommand && currentWorkflow) {
        improveWorkflow()
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `${currentWorkflow.name}の改善案を作成しました。自動化できるステップを特定し、処理時間を短縮する提案をしています。改善後のフローでは、手作業の多くを自動化し、全体の処理時間を${Math.round((currentWorkflow.steps.reduce((total, step) => total + step.timeRequired, 0) / 2))}分短縮できます。`,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      } else if (addStepCommand && currentWorkflow) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `新しいステップを追加します。ステップのタイトル、説明、担当者、所要時間を教えてください。例えば「タイトル: 顧客フォローアップ、説明: 出荷後に顧客に連絡して満足度を確認する、担当: 営業担当、時間: 10分」のような形式で入力してください。`,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      } else if (saveCommand && currentWorkflow) {
        saveWorkflow()
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `${currentWorkflow.name}を保存しました。このフローはダッシュボードから確認できます。`,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      } else if (navigateCommand) {
        let destination = ''
        if (/ダッシュボード/i.test(input)) {
          router.push('/')
          destination = 'ダッシュボードに移動します。'
        } else if (/業務フロー一覧/i.test(input)) {
          router.push('/workflows')
          destination = '業務フロー一覧に移動します。'
        } else if (/マイページ/i.test(input)) {
          router.push('/mypage')
          destination = 'マイページに移動します。'
        }
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: destination,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      }
      
      // ステップ追加コマンドの処理（2回目のメッセージ）
      if (/タイトル:(.+)、説明:(.+)、担当:(.+)、時間:(.+)/.test(input)) {
        const match = input.match(/タイトル:(.+)、説明:(.+)、担当:(.+)、時間:(.+)/)
        if (match && match.length === 5 && currentWorkflow) {
          const [_, title, description, assignee, timeStr] = match
          const timeRequired = parseInt(timeStr.replace(/[^0-9]/g, ''), 10)
          
          if (!isNaN(timeRequired)) {
            addStep({
              title: title.trim(),
              description: description.trim(),
              assignee: assignee.trim(),
              timeRequired
            })
            
            const assistantMessage: Message = {
              id: Date.now().toString(),
              content: `新しいステップ「${title.trim()}」を追加しました。`,
              sender: 'assistant',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, assistantMessage])
            setIsLoading(false)
            return
          }
        }
      }
      
      // Claude APIを呼び出す
      try {
        // ワークフロー情報をコンテキストとして送信（propsから受け取ったものを優先）
        const contextToSend = workflowContext || (currentWorkflow ? {
          id: currentWorkflow.id,
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          steps: currentWorkflow.steps,
          isImproved: currentWorkflow.isImproved,
          originalId: currentWorkflow.originalId
        } : undefined);
        
        console.log('Calling Claude API with message:', input);
        console.log('Company Info:', companyInfo);
        console.log('Employees:', employees);
        console.log('Workflow Context:', contextToSend);
        
        // 会社情報と従業員情報の確認
        console.log('Before API call - Company Info:', companyInfo);
        if (!companyInfo) {
          console.warn('Company info is null or undefined before API call');
        } else if (typeof companyInfo !== 'object') {
          console.warn('Company info is not an object before API call:', typeof companyInfo);
        } else {
          console.log('Company info is valid before API call');
        }
        
        // 従業員情報の確認
        console.log('Before API call - Employees:', employees);
        if (!employees || !Array.isArray(employees) || employees.length === 0) {
          console.warn('Employees is null, undefined, not an array, or empty before API call');
        } else {
          console.log('Employees is valid before API call');
        }
        
        // callClaudeAPI関数を使用してAPIを呼び出す（会社情報、従業員情報、ワークフロー情報を含める）
        const response = await callClaudeAPI(input, companyInfo, employees, contextToSend);
        
        console.log('Claude API Response:', response);
        
        if (response) {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            content: response,
            sender: 'assistant',
            timestamp: new Date()
          }
          
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('Empty response from Claude API');
        }
      } catch (error) {
        console.error('Error calling Claude API:', error)
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: 'APIの呼び出し中にエラーが発生しました。しばらくしてからもう一度お試しください。',
          sender: 'assistant',
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, errorMessage])
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'メッセージの送信中にエラーが発生しました。もう一度お試しください。',
        sender: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

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
    <div className="chat-container h-full flex flex-col">
      <div className="chat-header">
        <h2 className="text-lg font-medium text-secondary-900">Kaizen アシスタント</h2>
        <p className="text-sm text-secondary-500">業務改善のサポートをします</p>
      </div>
      
      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${
              message.sender === 'user' ? 'chat-message-user' : 'chat-message-assistant'
            }`}
          >
            {message.sender === 'user' ? (
              <div className="text-sm">{message.content}</div>
            ) : (
              <div className="text-sm markdown-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            <div className="text-xs text-secondary-400 mt-1">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message chat-message-assistant">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="flex-1 p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`px-4 py-2 rounded-md ${
              !input.trim() || isLoading
                ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            送信
          </button>
        </div>
        <p className="text-xs text-secondary-500 mt-2">
          Enterキーを2回押して送信、Shift+Enterで改行
        </p>
      </div>
    </div>
  )
}
