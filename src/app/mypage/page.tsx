'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { CompanyInfo as CompanyInfoType, Employee } from '@/utils/api'
import { useUser } from '@/contexts/UserContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { UserProfile } from '@/components/auth/UserProfile'
import { CompanyInfo } from '@/components/mypage/CompanyInfo'
import { EmployeeList } from '@/components/mypage/EmployeeList'
import { TemplateList } from '@/components/mypage/TemplateList'

// テンプレートのインターフェース
interface Template {
  id: string
  title: string
  content: string
}

// ローカルストレージのキー
const COMPANY_INFO_STORAGE_KEY = 'kaizen_company_info'
const EMPLOYEES_STORAGE_KEY = 'kaizen_employees'
const TEMPLATES_STORAGE_KEY = 'kaizen_templates'

export default function MyPage() {
  // 認証状態とユーザー情報
  const { isAuthenticated, currentUser, loginWithSession } = useUser()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  
  // NextAuth.jsのセッション情報を使用してユーザー情報を設定
  useEffect(() => {
    const syncUserWithSession = async () => {
      if (status === 'authenticated' && session?.user && !isAuthenticated) {
        // loginWithSessionを使用してユーザー情報を設定（未認証の場合のみ）
        await loginWithSession(session.user)
      }
    }
    
    syncUserWithSession()
  }, [session, status, loginWithSession, isAuthenticated])
  
  // タブの状態管理
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'employees' | 'templates'>('profile')
  
  // 管理者権限の確認
  const isAdmin = currentUser?.role === '管理者'
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // デフォルトの会社情報
  const defaultCompanyInfo: CompanyInfoType = {
    name: '株式会社サンプル',
    industry: 'IT',
    size: '50-100人',
    address: '東京都渋谷区',
    businessDescription: 'ビジネスプロセス改善ソリューションの提供',
    foundedYear: '2010',
    website: 'https://example.com',
    contactEmail: 'info@example.com'
  }
  
  // デフォルトの従業員情報
  const defaultEmployees: Employee[] = [
    {
      id: '1',
      name: '山田太郎',
      position: '営業部長',
      department: '営業部',
      hourlyRate: 3000
    },
    {
      id: '2',
      name: '佐藤花子',
      position: '経理担当',
      department: '管理部',
      hourlyRate: 2500
    },
    {
      id: '3',
      name: '鈴木一郎',
      position: '倉庫管理者',
      department: '物流部',
      hourlyRate: 2000
    }
  ]
  
  // デフォルトのテンプレート
  const defaultTemplates: Template[] = [
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
  
  // 状態管理
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoType>(defaultCompanyInfo)
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees)
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates)
  
  // コンポーネントのマウント時にローカルストレージから情報を読み込む
  useEffect(() => {
    console.log('=== Loading Data from LocalStorage ===');
    
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined') {
      // 会社情報の読み込み
      const savedCompanyInfo = localStorage.getItem(COMPANY_INFO_STORAGE_KEY)
      console.log('Raw Company Info from LocalStorage:', savedCompanyInfo);
      
      if (savedCompanyInfo) {
        try {
          const parsedCompanyInfo = JSON.parse(savedCompanyInfo);
          console.log('Parsed Company Info:', parsedCompanyInfo);
          setCompanyInfo(parsedCompanyInfo)
        } catch (error) {
          console.error('Failed to parse company info from localStorage:', error)
        }
      } else {
        console.log('No company info found in localStorage, using default');
      }
      
      // 従業員情報の読み込み
      const savedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
      console.log('Raw Employees from LocalStorage:', savedEmployees);
      
      if (savedEmployees) {
        try {
          const parsedEmployees = JSON.parse(savedEmployees);
          console.log('Parsed Employees:', parsedEmployees);
          setEmployees(parsedEmployees)
        } catch (error) {
          console.error('Failed to parse employees from localStorage:', error)
        }
      } else {
        console.log('No employees found in localStorage, using default');
      }
      
      // テンプレート情報の読み込み
      const savedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY)
      console.log('Raw Templates from LocalStorage:', savedTemplates);
      
      if (savedTemplates) {
        try {
          const parsedTemplates = JSON.parse(savedTemplates);
          console.log('Parsed Templates:', parsedTemplates);
          setTemplates(parsedTemplates)
        } catch (error) {
          console.error('Failed to parse templates from localStorage:', error)
        }
      } else {
        console.log('No templates found in localStorage, using default');
        // デフォルトのテンプレートをローカルストレージに保存
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(defaultTemplates))
      }
    }
  }, [])
  
  // 保存成功メッセージを5秒後に非表示にする
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])
  
  // 会社情報の保存ハンドラ
  const handleSaveCompanyInfo = (updatedInfo: CompanyInfoType) => {
    setCompanyInfo(updatedInfo)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(COMPANY_INFO_STORAGE_KEY, JSON.stringify(updatedInfo))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 従業員の追加ハンドラ
  const handleAddEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      id: Date.now().toString(),
      ...employee
    }
    
    const updatedEmployees = [...employees, newEmployee]
    setEmployees(updatedEmployees)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updatedEmployees))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 従業員の編集ハンドラ
  const handleEditEmployee = (employee: Employee) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employee.id ? employee : emp
    )
    
    setEmployees(updatedEmployees)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updatedEmployees))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 従業員の削除ハンドラ
  const handleDeleteEmployee = (id: string) => {
    const updatedEmployees = employees.filter(emp => emp.id !== id)
    setEmployees(updatedEmployees)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updatedEmployees))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // テンプレートの追加ハンドラ
  const handleAddTemplate = (template: Omit<Template, 'id'>) => {
    const newTemplate: Template = {
      id: Date.now().toString(),
      ...template
    }
    
    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // テンプレートの編集ハンドラ
  const handleEditTemplate = (template: Template) => {
    const updatedTemplates = templates.map(temp => 
      temp.id === template.id ? template : temp
    )
    
    setTemplates(updatedTemplates)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // テンプレートの削除ハンドラ
  const handleDeleteTemplate = (id: string) => {
    const updatedTemplates = templates.filter(temp => temp.id !== id)
    setTemplates(updatedTemplates)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates))
    }
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 認証モードの切り替え
  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login')
  }
  
  // 認証成功時の処理
  const handleAuthSuccess = () => {
    // 認証成功後の処理（必要に応じて）
  }
  
  // 認証状態をチェック
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])
  
  // 認証されていない場合はローディング表示
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  return (
    <DashboardLayout companyName={companyInfo.name}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">マイページ</h1>
            <p className="text-secondary-600">ユーザー情報と会社情報を管理します</p>
          </div>
          {saveSuccess && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md">
              変更が保存されました
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-secondary-200">
            <div className="flex space-x-8 px-6">
              <button
                className={`py-4 font-medium ${
                  activeTab === 'profile'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                プロフィール
              </button>
              <button
                className={`py-4 font-medium ${
                  activeTab === 'company'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
                onClick={() => setActiveTab('company')}
              >
                会社情報
              </button>
              {isAdmin && (
                <button
                  className={`py-4 font-medium ${
                    activeTab === 'employees'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-secondary-500 hover:text-secondary-700'
                  }`}
                  onClick={() => setActiveTab('employees')}
                >
                  従業員情報
                </button>
              )}
              <button
                className={`py-4 font-medium ${
                  activeTab === 'templates'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
                onClick={() => setActiveTab('templates')}
              >
                テンプレート
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'profile' ? (
              <UserProfile />
            ) : activeTab === 'company' ? (
              <CompanyInfo 
                companyInfo={companyInfo} 
                onSave={handleSaveCompanyInfo}
                isEditable={isAdmin}
              />
            ) : activeTab === 'employees' && isAdmin ? (
              <EmployeeList 
                employees={employees}
                onAdd={handleAddEmployee}
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
              />
            ) : (
              <TemplateList
                templates={templates}
                onAdd={handleAddTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
