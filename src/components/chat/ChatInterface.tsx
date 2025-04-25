'use client'

import React, { useState, useRef, useEffect, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { WorkflowContext, WorkflowContextProvider } from '../../contexts/WorkflowContext'
import { useChat } from '../../contexts/ChatContext'
import { callClaudeAPI } from '../../utils/api'
import { ChatHeader } from './ChatHeader'
import { ChatMenu } from './ChatMenu'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatModals } from './ChatModals'

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

import { CompanyInfo, Employee, WorkflowContext as WorkflowContextType } from '../../utils/api'

interface ChatInterfaceProps {
  standalone?: boolean
  companyInfo?: CompanyInfo
  employees?: Employee[]
  workflowContext?: WorkflowContextType
  onOpenChange?: (isOpen: boolean) => void
  defaultOpen?: boolean
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  standalone = false,
  companyInfo,
  employees,
  workflowContext,
  onOpenChange,
  defaultOpen = false
}) => {
  // チャットの状態をグローバルコンテキストから取得
  const { isOpen, isExpanded, setIsOpen, setIsExpanded, toggleExpand } = useChat()
  
  // コンポーネントマウント時にデフォルト値を設定
  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true)
    }
  }, [defaultOpen, setIsOpen])
  
  // メモ関連の状態
  const [showMemoTitleInput, setShowMemoTitleInput] = useState(false)
  const [memoTitle, setMemoTitle] = useState('')
  const [showMemoList, setShowMemoList] = useState(false)
  const [savedMemos, setSavedMemos] = useState<MemoItem[]>([])
  
  // テンプレート関連の状態
  const [showTemplateList, setShowTemplateList] = useState(false)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  
  // 共有関連の状態
  const [showShareModal, setShowShareModal] = useState(false)
  
  // コンポーネントマウント時にローカルストレージからメモを読み込む
  useEffect(() => {
    const storedMemos = localStorage.getItem('chatMemos')
    if (storedMemos) {
      try {
        const parsedMemos = JSON.parse(storedMemos)
        
        // JSONから復元されたデータのtimestampをDateオブジェクトに変換
        const processedMemos = parsedMemos.map((memo: any) => {
          // メモのタイムスタンプを変換
          const memoWithDate = {
            ...memo,
            timestamp: new Date(memo.timestamp)
          }
          
          // メッセージ内のタイムスタンプも変換
          if (Array.isArray(memo.content)) {
            memoWithDate.content = memo.content.map((message: any) => ({
              ...message,
              timestamp: new Date(message.timestamp)
            }))
          }
          
          return memoWithDate
        })
        
        setSavedMemos(processedMemos)
      } catch (error) {
        console.error('Failed to parse stored memos:', error)
      }
    }
    
    // テンプレートデータをローカルストレージから取得
    const storedTemplates = localStorage.getItem('kaizen_templates')
    if (storedTemplates) {
      try {
        const parsedTemplates = JSON.parse(storedTemplates)
        setTemplates(parsedTemplates)
      } catch (error) {
        console.error('Failed to parse stored templates:', error)
        
        // エラーが発生した場合はデフォルトのテンプレートを使用
        const defaultTemplates: TemplateItem[] = [
          {
            id: '1',
            title: '業務報告',
            content: '今日の業務内容：\n\n達成したこと：\n\n明日の予定：\n\n課題・問題点：'
          },
          {
            id: '2',
            title: '会議議事録',
            content: '日時：\n参加者：\n\n議題：\n\n決定事項：\n\n次回アクション：'
          },
          {
            id: '3',
            title: '顧客問い合わせ対応',
            content: '顧客名：\n問い合わせ内容：\n\n対応内容：\n\nフォローアップ：'
          }
        ]
        setTemplates(defaultTemplates)
      }
    } else {
      // ローカルストレージにテンプレートがない場合はデフォルトのテンプレートを使用
      const defaultTemplates: TemplateItem[] = [
        {
          id: '1',
          title: '業務報告',
          content: '今日の業務内容：\n\n達成したこと：\n\n明日の予定：\n\n課題・問題点：'
        },
        {
          id: '2',
          title: '会議議事録',
          content: '日時：\n参加者：\n\n議題：\n\n決定事項：\n\n次回アクション：'
        },
        {
          id: '3',
          title: '顧客問い合わせ対応',
          content: '顧客名：\n問い合わせ内容：\n\n対応内容：\n\nフォローアップ：'
        }
      ]
      setTemplates(defaultTemplates)
    }
  }, [])

  // isOpenの状態が変わったら親コンポーネントに通知
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

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

  // ローカルストレージからチャットメッセージを読み込む
  useEffect(() => {
    const storedMessages = localStorage.getItem('chat_messages')
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages)
        // JSONから復元されたデータのtimestampをDateオブジェクトに変換
        const processedMessages = parsedMessages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }))
        setMessages(processedMessages)
      } catch (error) {
        console.error('チャットメッセージの解析エラー:', error)
      }
    }
  }, [])

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
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
        setIsLoading(false);
        return;
      } else if (addStepCommand && currentWorkflow) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `新しいステップを追加します。ステップのタイトル、説明、担当者、所要時間を教えてください。例えば「タイトル: 顧客フォローアップ、説明: 出荷後に顧客に連絡して満足度を確認する、担当: 営業担当、時間: 10分」のような形式で入力してください。`,
          sender: 'assistant',
          timestamp: new Date()
        }
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
        setIsLoading(false);
        return;
      } else if (saveCommand && currentWorkflow) {
        saveWorkflow()
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `${currentWorkflow.name}を保存しました。このフローはダッシュボードから確認できます。`,
          sender: 'assistant',
          timestamp: new Date()
        }
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
        setIsLoading(false);
        return;
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
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
        setIsLoading(false);
        return;
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
            const updatedMessages = [...messages, userMessage, assistantMessage];
            setMessages(updatedMessages);
            localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
            setIsLoading(false);
            return;
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
          
          // メッセージを状態に追加
          setMessages(prev => [...prev, assistantMessage]);
          
          // ローカルストレージにメッセージを保存
          const updatedMessages = [...messages, userMessage, assistantMessage];
          localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
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
        
        const updatedMessages = [...messages, userMessage, errorMessage];
        setMessages(updatedMessages);
        localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'メッセージの送信中にエラーが発生しました。もう一度お試しください。',
        sender: 'assistant',
        timestamp: new Date()
      }
      
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
    } finally {
      setIsLoading(false)
    }
  }

  // チャットを開く
  const openChat = () => {
    setIsOpen(true)
  }

  // チャットを閉じる
  const closeChat = () => {
    setIsOpen(false)
    // チャットを閉じるときに拡張状態もリセット
    if (isExpanded) {
      setIsExpanded(false)
    }
  }

  // メモを保存する
  const handleSaveMemo = () => {
    if (memoTitle.trim()) {
      // メモを保存する処理
      const memo: MemoItem = {
        title: memoTitle.trim(),
        content: messages,
        timestamp: new Date()
      }
      const updatedMemos = [...savedMemos, memo]
      setSavedMemos(updatedMemos)
      localStorage.setItem('chatMemos', JSON.stringify(updatedMemos))
      
      // モーダルを閉じてタイトルをリセット
      setShowMemoTitleInput(false)
      setMemoTitle('')
    }
  }

  // メモを選択する
  const handleSelectMemo = (memo: MemoItem) => {
    setMessages(memo.content)
    setShowMemoList(false)
  }

  // テンプレートを選択する
  const handleSelectTemplate = (template: TemplateItem) => {
    setInput(template.content)
    setShowTemplateList(false)
  }
  
  // チャットを共有する
  const handleShareChat = () => {
    setShowShareModal(true)
  }
  
  // チャットをテキスト形式でコピーする
  const handleCopyAsText = () => {
    const chatText = messages.map(msg => {
      const sender = msg.sender === 'user' ? 'ユーザー' : 'アシスタント'
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `[${time}] ${sender}:\n${msg.content}\n`
    }).join('\n')
    
    navigator.clipboard.writeText(chatText)
      .then(() => {
        alert('チャット内容をクリップボードにコピーしました')
        setShowShareModal(false)
      })
      .catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err)
        alert('コピーに失敗しました。もう一度お試しください。')
      })
  }
  
  // チャットをMarkdown形式でコピーする
  const handleCopyAsMarkdown = () => {
    const chatMarkdown = messages.map(msg => {
      const sender = msg.sender === 'user' ? '## ユーザー' : '## アシスタント'
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `${sender} (${time})\n\n${msg.content}\n`
    }).join('\n---\n\n')
    
    navigator.clipboard.writeText(chatMarkdown)
      .then(() => {
        alert('チャット内容をMarkdown形式でクリップボードにコピーしました')
        setShowShareModal(false)
      })
      .catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err)
        alert('コピーに失敗しました。もう一度お試しください。')
      })
  }

  // 閉じている状態のチャットアイコン
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={openChat}
          className="w-14 h-14 bg-primary-500 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-all duration-200 transform hover:scale-105"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
        </button>
      </div>
    )
  }


  // 開いている状態のチャットインターフェース
  return (
    <div className={`fixed top-0 right-0 ${isExpanded ? 'w-192' : 'w-96'} h-screen z-50 flex flex-col bg-gradient-to-br from-white to-blue-50 shadow-lg border-l border-blue-100 transition-all duration-300`}>
      {/* チャットヘッダー */}
      <ChatHeader 
        onClose={closeChat} 
        isExpanded={isExpanded} 
        onToggleExpand={toggleExpand} 
      />
      
      {/* チャットメニュー */}
      <ChatMenu
        onNewChat={() => setMessages([])}
        onShowMemoTitleInput={() => setShowMemoTitleInput(true)}
        onShowMemoList={() => setShowMemoList(true)}
        onShowTemplateList={() => setShowTemplateList(true)}
        onShowShareModal={handleShareChat}
      />
      
      {/* チャットメッセージ */}
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />
      
      {/* チャット入力 */}
      <ChatInput
        input={input}
        setInput={setInput}
        handleSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
      
      {/* モーダル */}
      <ChatModals
        showMemoTitleInput={showMemoTitleInput}
        memoTitle={memoTitle}
        setMemoTitle={setMemoTitle}
        onCloseMemoTitleInput={() => {
          setShowMemoTitleInput(false)
          setMemoTitle('')
        }}
        onSaveMemo={handleSaveMemo}
        showMemoList={showMemoList}
        savedMemos={savedMemos}
        onCloseMemoList={() => setShowMemoList(false)}
        onSelectMemo={handleSelectMemo}
        showTemplateList={showTemplateList}
        templates={templates}
        onCloseTemplateList={() => setShowTemplateList(false)}
        onSelectTemplate={handleSelectTemplate}
        showShareModal={showShareModal}
        onCloseShareModal={() => setShowShareModal(false)}
        onCopyAsText={handleCopyAsText}
        onCopyAsMarkdown={handleCopyAsMarkdown}
      />
    </div>
  )
}
