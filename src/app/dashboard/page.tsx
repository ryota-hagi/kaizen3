'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

export default function DashboardPage() {
  const { isAuthenticated, currentUser } = useUser()
  const router = useRouter()
  
  // 認証状態をチェック
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])
  
  // 認証されていない場合はローディング表示
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  // 管理者向けのダッシュボードカード
  const adminCards = [
    {
      title: 'ユーザー管理',
      description: '社内ユーザーの追加、編集、削除を行います',
      icon: '👥',
      link: '/dashboard/users',
      color: 'bg-blue-100'
    },
    {
      title: 'ユーザー招待',
      description: '新規ユーザーを招待してシステムへのアクセス権を付与します',
      icon: '✉️',
      link: '/dashboard/invite',
      color: 'bg-purple-100'
    },
    {
      title: '会社情報',
      description: '会社情報の確認と編集を行います',
      icon: '🏢',
      link: '/dashboard/company',
      color: 'bg-green-100'
    }
  ]
  
  // マネージャー向けのダッシュボードカード
  const managerCards = [
    {
      title: 'ワークフロー管理',
      description: 'ワークフローの作成と管理を行います',
      icon: '📋',
      link: '/workflows',
      color: 'bg-purple-100'
    },
    {
      title: '従業員管理',
      description: '従業員情報の管理を行います',
      icon: '👤',
      link: '/dashboard/employees',
      color: 'bg-yellow-100'
    }
  ]
  
  // 一般ユーザー向けのダッシュボードカード
  const userCards = [
    {
      title: 'マイプロフィール',
      description: 'プロフィール情報の確認と編集を行います',
      icon: '👤',
      link: '/mypage',
      color: 'bg-indigo-100'
    },
    {
      title: 'テンプレート',
      description: '業務テンプレートの確認と利用',
      icon: '📝',
      link: '/dashboard/templates',
      color: 'bg-pink-100'
    }
  ]
  
  // ユーザーの役割に応じたカードを表示
  const getCardsByRole = () => {
    let cards = [...userCards]
    
    if (currentUser.role === '管理者') {
      cards = [...adminCards, ...managerCards, ...userCards]
    } else if (currentUser.role === 'マネージャー') {
      cards = [...managerCards, ...userCards]
    }
    
    return cards
  }
  
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">ダッシュボード</h1>
          <p className="text-secondary-600">
            こんにちは、{currentUser.fullName}さん（{currentUser.role}）
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getCardsByRole().map((card, index) => (
            <Link href={card.link} key={index}>
              <div className={`${card.color} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-medium text-secondary-900 mb-2">{card.title}</h3>
                <p className="text-secondary-600">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
        
      </div>
    </DashboardLayout>
  )
}
