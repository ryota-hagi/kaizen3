import '@/styles/globals.css'
import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import React from 'react'
import { WorkflowContextProvider } from '../contexts/WorkflowContext'
import { UserContextProvider } from '../contexts/UserContext'
import { ChatContextProvider } from '../contexts/ChatContext'
import { Providers } from './providers'

// 日本語フォントを設定（Noto Sans JP）
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: true,
  // 可変フォントを使用して最適化
  variable: '--font-noto-sans-jp',
})

export const metadata: Metadata = {
  title: 'Kaizen - 業務改善支援アプリ',
  description: '中小企業の業務改善を支援するアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <Providers>
          <UserContextProvider>
            <WorkflowContextProvider>
              <ChatContextProvider>
                {children}
              </ChatContextProvider>
            </WorkflowContextProvider>
          </UserContextProvider>
        </Providers>
      </body>
    </html>
  )
}
