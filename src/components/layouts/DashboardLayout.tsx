'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context' // パスを更新
import { useChat } from '@/contexts/ChatContext'
import { CompanyInfo as CompanyInfoType } from '@/utils/api'
import { CompanyMenu } from './CompanyMenu'

interface DashboardLayoutProps {
  children: React.ReactNode
  companyName?: string
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, companyName }) => {
  // デスクトップとモバイルで別々にサイドバーの状態を管理
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { currentUser } = useUser()
  const { isOpen, isExpanded } = useChat()
  const [company, setCompany] = useState<string>(companyName || '株式会社サンプル')
  
  // 画面サイズの変更を検知
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // md ブレークポイント
    }
    
    // 初期チェック
    checkIfMobile()
    
    // リサイズイベントのリスナーを追加
    window.addEventListener('resize', checkIfMobile)
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])
  
  // ローカルストレージから会社情報を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCompanyInfo = localStorage.getItem('kaizen_company_info')
      if (savedCompanyInfo) {
        try {
          const parsedCompanyInfo = JSON.parse(savedCompanyInfo) as CompanyInfoType
          if (parsedCompanyInfo.name) {
            setCompany(parsedCompanyInfo.name)
          }
        } catch (error) {
          console.error('Failed to parse company info from localStorage:', error)
        }
      }
    }
  }, [companyName])
  
  // 現在のパスを取得
  const pathname = usePathname();
  
  // モバイルでサイドバーを閉じる
  const closeMobileSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(false)
    }
  }
  
  // ナビゲーションリンク
  const navLinks = [
    {
      href: '/',
      label: 'ホーム',
      shortLabel: 'H',
      isActive: pathname === '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: '/mypage',
      label: 'マイページ',
      shortLabel: 'M',
      isActive: pathname === '/mypage',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    ...(currentUser && currentUser.role === '管理者' ? [
      {
        href: '/dashboard/users',
        label: 'ユーザー管理',
        shortLabel: 'U',
        isActive: pathname === '/dashboard/users',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      }
    ] : [])
  ]
  
  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col md:flex-row">
      {/* モバイル用ヘッダー */}
      <div className="md:hidden bg-white border-b border-secondary-200 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="text-secondary-500 hover:text-secondary-700 p-2 mr-2"
            aria-label="メニューを開く"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary-600">Kaizen</h1>
        </div>
        <div>
          {/* 右側に必要なアクションボタンがあれば追加 */}
        </div>
      </div>
      
      {/* モバイル用オーバーレイ */}
      {isMobile && mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-secondary-800 bg-opacity-50 z-10"
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* サイドバー */}
      <div 
        className={`
          bg-white border-r border-secondary-200 flex flex-col transition-all duration-300 ease-in-out
          ${isMobile ? 'fixed inset-y-0 left-0 z-20' : 'relative'}
          ${isMobile ? (mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
          ${!isMobile && sidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* デスクトップ用ヘッダー */}
        <div className="p-4 flex items-center justify-between border-b border-secondary-200">
          <h1 className={`text-2xl font-bold text-primary-600 ${!isMobile && sidebarCollapsed ? 'hidden' : 'block'}`}>
            Kaizen
          </h1>
          {isMobile ? (
            <button
              onClick={closeMobileSidebar}
              className="text-secondary-500 hover:text-secondary-700"
              aria-label="メニューを閉じる"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-secondary-500 hover:text-secondary-700"
              aria-label={sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            >
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link, index) => (
            <Link 
              key={index}
              href={link.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full mb-2 cursor-pointer ${
                link.isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-secondary-700 hover:bg-secondary-50'
              }`}
              onClick={closeMobileSidebar}
            >
              {link.icon}
              <span className={!isMobile && sidebarCollapsed ? 'hidden' : 'block'}>{link.label}</span>
              <span className={!isMobile && sidebarCollapsed ? 'block' : 'hidden'}>{link.shortLabel}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-secondary-200">
          {!isMobile && sidebarCollapsed ? (
            <div className="flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-secondary-700">
              <span>会</span>
            </div>
          ) : (
            <CompanyMenu 
              companyName={company} 
              isAdmin={currentUser?.role === '管理者'} 
            />
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ 
          marginLeft: isMobile ? '0' : (sidebarCollapsed ? '0.5rem' : '1rem'),
          marginRight: isOpen ? '1rem' : '0',
          padding: isMobile ? '0.5rem' : '1rem',
          paddingTop: isMobile ? '0.5rem' : '1rem',
          flex: '1 1 auto',
          width: 'auto'
        }}
      >
        {children}
      </div>
    </div>
  )
}
