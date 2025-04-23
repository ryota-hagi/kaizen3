import '@/styles/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import { WorkflowContextProvider } from '../contexts/WorkflowContext'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <WorkflowContextProvider>
          {children}
        </WorkflowContextProvider>
      </body>
    </html>
  )
}
