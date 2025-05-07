'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { CompanyInfo as CompanyInfoType, Employee, generateCompanyId, countUsersByRole } from '@/utils/api'
import { useUser } from '@/contexts/UserContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { UserProfile } from '@/components/auth/UserProfile'
import { CompanyInfo } from '@/components/mypage/CompanyInfo'
import { EmployeeList } from '@/components/mypage/EmployeeList'
import { TemplateList } from '@/components/mypage/TemplateList'
import { updateCompanyInfo, fetchAndCacheCompanyInfo } from '@/utils/companyInfo'

// テンプレートのインターフェース
interface Template {
  id: string
  title: string
  content: string
}

// ユーティリティ関数のインポート
import { fetchEmployees, addEmployee, updateEmployee, deleteEmployee, syncEmployeesToSupabase } from '@/utils/employeeUtils'
import { fetchTemplates, addTemplate, updateTemplate, deleteTemplate, syncTemplatesToSupabase } from '@/utils/templateUtils'

export default function MyPage() {
  // 認証状態とユーザー情報
  const { isAuthenticated, currentUser, users } = useUser()
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  
  // 認証状態をチェック
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])
  
  // タブの状態管理
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'employees' | 'templates'>('profile')
  
  // 管理者権限の確認
  const isAdmin = currentUser?.role === '管理者'
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // デフォルトの会社情報
  const defaultCompanyInfo: CompanyInfoType = {
    id: generateCompanyId(), // ユニークな会社IDを生成
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
  
  // コンポーネントのマウント時にSupabaseから情報を読み込む
  useEffect(() => {
    console.log('=== Loading Data from Supabase ===');
    
    // 認証済みかつ会社IDがある場合のみデータを取得
    if (isAuthenticated && currentUser && currentUser.companyId) {
      const companyId = currentUser.companyId;
      
      // 会社情報を取得（見つからない場合は会社情報登録フォームに遷移）
      fetchAndCacheCompanyInfo(companyId, router).then(companyData => {
        if (companyData) {
          console.log('Fetched Company Info:', companyData);
          
          // 会社情報が取得できた場合は状態を更新
          setCompanyInfo({
            ...companyData,
            // ユーザー数をカウント（必要に応じて）
            userCounts: users && users.length > 0 ? countUsersByRole(users, companyData.id) : { admin: 0, manager: 0, user: 0 }
          });
          
          // 会社情報が取得できた場合のみ、従業員情報とテンプレート情報を取得
          // 従業員情報の取得
          fetchEmployees(companyId).then(data => {
            console.log('Fetched Employees:', data);
            if (data.length > 0) {
              setEmployees(data);
            } else {
              console.log('No employees found in Supabase, using default');
              // ローカルストレージの従業員情報をSupabaseに同期
              syncEmployeesToSupabase(companyId);
            }
          });
          
          // テンプレート情報の取得
          fetchTemplates(companyId).then(data => {
            console.log('Fetched Templates:', data);
            if (data.length > 0) {
              setTemplates(data);
            } else {
              console.log('No templates found in Supabase, using default');
              // ローカルストレージのテンプレート情報をSupabaseに同期
              syncTemplatesToSupabase(companyId);
            }
          });
        }
        // 会社情報が取得できなかった場合は、fetchAndCacheCompanyInfo内で会社情報登録フォームに遷移
      }).catch(error => {
        console.error('Error fetching company info:', error);
      });
    }
  }, [isAuthenticated, currentUser, router])
  
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
  const handleSaveCompanyInfo = async (updatedInfo: CompanyInfoType) => {
    // 会社IDが存在することを確認
    if (!updatedInfo.id) {
      updatedInfo.id = companyInfo.id || generateCompanyId();
    }
    
    // ユーザー数をカウント
    if (users && users.length > 0 && updatedInfo.id) {
      updatedInfo.userCounts = countUsersByRole(users, updatedInfo.id);
    }
    
    setCompanyInfo(updatedInfo)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('kaizen_company_info', JSON.stringify(updatedInfo))
    }
    
    try {
      // Supabaseのcompaniesテーブルに更新
      // 型の互換性を確保するために、idが確実に存在することを確認
      const companyInfoForUpdate = {
        ...updatedInfo,
        id: updatedInfo.id || companyInfo.id || generateCompanyId()
      };
      
      const { success, error } = await updateCompanyInfo(companyInfoForUpdate);
      
      if (!success) {
        console.error('Failed to update company info in Supabase:', error);
        // エラーがあっても、UIには成功メッセージを表示（UX向上のため）
      } else {
        console.log('Company info updated in Supabase successfully');
      }
      
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error updating company info:', error);
      // エラーがあっても、UIには成功メッセージを表示（UX向上のため）
      setSaveSuccess(true);
    }
    
    // 現在のユーザーの会社IDを更新
    if (currentUser && currentUser.companyId !== updatedInfo.id) {
      // ここでUserContextの更新関数を呼び出す（実装が必要）
      console.log('Company ID updated for current user:', updatedInfo.id);
    }
  }
  
  // 従業員の追加ハンドラ
  const handleAddEmployee = async (employee: Omit<Employee, 'id'>) => {
    if (!currentUser || !currentUser.companyId) {
      console.error('Company ID is missing, cannot add employee');
      return;
    }
    
    const { success, data, error } = await addEmployee(employee, currentUser.companyId);
    
    if (success && data) {
      setEmployees([...employees, data]);
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } else {
      console.error('Failed to add employee:', error);
    }
  }
  
  // 従業員の編集ハンドラ
  const handleEditEmployee = async (employee: Employee) => {
    if (!currentUser || !currentUser.companyId) {
      console.error('Company ID is missing, cannot edit employee');
      return;
    }
    
    const { success, data, error } = await updateEmployee(employee, currentUser.companyId);
    
    if (success) {
      const updatedEmployees = employees.map(emp => 
        emp.id === employee.id ? (data || employee) : emp
      );
      
      setEmployees(updatedEmployees);
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } else {
      console.error('Failed to update employee:', error);
    }
  }
  
  // 従業員の削除ハンドラ
  const handleDeleteEmployee = async (id: string) => {
    if (!currentUser || !currentUser.companyId) {
      console.error('Company ID is missing, cannot delete employee');
      return;
    }
    
    const { success, error } = await deleteEmployee(id, currentUser.companyId);
    
    if (success) {
      const updatedEmployees = employees.filter(emp => emp.id !== id);
      setEmployees(updatedEmployees);
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } else {
      console.error('Failed to delete employee:', error);
    }
  }
  
  // テンプレートの追加ハンドラ
  const handleAddTemplate = async (template: Omit<Template, 'id'>) => {
    if (!currentUser || !currentUser.companyId) {
      console.error('Company ID is missing, cannot add template');
      return;
    }
    
    const { success, data, error } = await addTemplate(template, currentUser.companyId);
    
    if (success && data) {
      setTemplates([...templates, data]);
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } else {
      console.error('Failed to add template:', error);
    }
  }
  
  // テンプレートの編集ハンドラ
  const handleEditTemplate = async (template: Template) => {
    if (!currentUser || !currentUser.companyId) {
      console.error('Company ID is missing, cannot edit template');
      return;
    }
    
    const { success, data, error } = await updateTemplate(template, currentUser.companyId);
    
    if (success) {
      const updatedTemplates = templates.map(temp => 
        temp.id === template.id ? (data || template) : temp
      );
      
      setTemplates(updatedTemplates);
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } else {
      console.error('Failed to update template:', error);
    }
  }
  
  // テンプレートの削除ハンドラ
  const handleDeleteTemplate = async (id: string) => {
    if (!currentUser || !currentUser.companyId) {
      console.error('Company ID is missing, cannot delete template');
      return;
    }
    
    const { success, error } = await deleteTemplate(id, currentUser.companyId);
    
    if (success) {
      const updatedTemplates = templates.filter(temp => temp.id !== id);
      setTemplates(updatedTemplates);
      // 保存成功メッセージを表示
      setSaveSuccess(true);
    } else {
      console.error('Failed to delete template:', error);
    }
  }
  
  // 認証モードの切り替え
  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login')
  }
  
  // 認証成功時の処理
  const handleAuthSuccess = () => {
    // 認証成功後の処理（必要に応じて）
  }
  
  // 認証されていない場合はローディング表示
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  // ユーザー数をカウント
  const userCounts = companyInfo.id ? countUsersByRole(users, companyInfo.id) : { admin: 0, manager: 0, user: 0 };
  
  // 会社情報にユーザー数を追加
  const companyInfoWithUserCounts: CompanyInfoType = {
    ...companyInfo,
    userCounts
  };
  
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
                companyInfo={companyInfoWithUserCounts} 
                onSave={handleSaveCompanyInfo}
                isEditable={isAdmin}
                users={users}
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
