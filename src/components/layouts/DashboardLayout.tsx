'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { useChat } from '@/contexts/ChatContext'

interface DashboardLayoutProps {
  children: React.ReactNode
  companyName?: string
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, companyName = '株式会社サンプル' }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { currentUser } = useUser()
  const { isOpen, isExpanded } = useChat()
  
  // 現在のパスを取得する関数（クライアントサイドでのみ実行）
  const getCurrentPath = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  };
  
  return (
    <div className="min-h-screen bg-secondary-50 flex">
      {/* サイドバー */}
      <div 
        className={`bg-white border-r border-secondary-200 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-secondary-200">
          <h1 className={`text-2xl font-bold text-primary-600 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
            Kaizen
          </h1>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-secondary-500 hover:text-secondary-700"
          >
            {sidebarCollapsed ? '>' : '<'}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link 
            href="/" 
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              getCurrentPath() === '/' 
                ? 'bg-primary-50 text-primary-700' 
                : 'text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <span className={sidebarCollapsed ? 'hidden' : 'block'}>ダッシュボード</span>
            <span className={sidebarCollapsed ? 'block' : 'hidden'}>D</span>
          </Link>
          <Link 
            href="/mypage" 
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              getCurrentPath() === '/mypage' 
                ? 'bg-primary-50 text-primary-700' 
                : 'text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <span className={sidebarCollapsed ? 'hidden' : 'block'}>マイページ</span>
            <span className={sidebarCollapsed ? 'block' : 'hidden'}>M</span>
          </Link>
          
          {/* 管理者向けメニュー */}
          {currentUser && currentUser.role === '管理者' && (
            <Link 
              href="/dashboard/users" 
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                getCurrentPath() === '/dashboard/users' 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <span className={sidebarCollapsed ? 'hidden' : 'block'}>ユーザー管理</span>
              <span className={sidebarCollapsed ? 'block' : 'hidden'}>U</span>
            </Link>
          )}
        </nav>
        
        <div className="p-4 border-t border-secondary-200">
          <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md text-secondary-700 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            <span className={sidebarCollapsed ? 'hidden' : 'block'}>{companyName}</span>
            <span className={sidebarCollapsed ? 'block' : 'hidden'}>会</span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ 
          marginLeft: '1rem',
          marginRight: isOpen ? '1rem' : '0',
          flex: '1 1 auto',
          width: 'auto'
        }}>
        {children}
      </div>
    </div>
  )
}
