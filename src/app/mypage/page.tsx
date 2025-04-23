'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/layouts/DashboardLayout'
import { CompanyInfo, Employee } from '../../utils/api'

// ローカルストレージのキー
const COMPANY_INFO_STORAGE_KEY = 'kaizen_company_info'
const EMPLOYEES_STORAGE_KEY = 'kaizen_employees'

export default function MyPage() {
  // タブの状態管理
  const [activeTab, setActiveTab] = useState<'company' | 'employees'>('company')
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // デフォルトの会社情報
  const defaultCompanyInfo: CompanyInfo = {
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
  
  // 状態管理
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo)
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees)
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  
  // 新規従業員の状態
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id'>>({
    name: '',
    position: '',
    department: '',
    hourlyRate: 0
  })
  
  // 編集中の従業員の状態
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
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
  
  // 会社情報の変更ハンドラ
  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // 会社情報の保存ハンドラ
  const handleSaveCompanyInfo = () => {
    console.log('=== Saving Company Info ===');
    console.log('Company Info to Save:', JSON.stringify(companyInfo, null, 2));
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(COMPANY_INFO_STORAGE_KEY, JSON.stringify(companyInfo))
      
      // 保存後に再度読み込んで確認
      try {
        const savedCompanyInfo = localStorage.getItem(COMPANY_INFO_STORAGE_KEY);
        console.log('Saved Company Info:', savedCompanyInfo);
      } catch (error) {
        console.error('Error reading saved company info:', error);
      }
    }
    
    // 編集モードを終了
    setIsEditingCompany(false)
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 新規従業員の変更ハンドラ
  const handleNewEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewEmployee(prev => ({
      ...prev,
      [name]: name === 'hourlyRate' ? Number(value) : value
    }))
  }
  
  // 編集中の従業員の変更ハンドラ
  const handleEditEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingEmployee) return
    
    const { name, value } = e.target
    setEditingEmployee(prev => ({
      ...prev!,
      [name]: name === 'hourlyRate' ? Number(value) : value
    }))
  }
  
  // 従業員の追加ハンドラ
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    
    const employee: Employee = {
      id: Date.now().toString(),
      ...newEmployee
    }
    
    const updatedEmployees = [...employees, employee]
    setEmployees(updatedEmployees)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updatedEmployees))
    }
    
    // フォームをリセット
    setNewEmployee({
      name: '',
      position: '',
      department: '',
      hourlyRate: 0
    })
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 従業員の編集ハンドラ
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
  }
  
  // 編集した従業員の保存ハンドラ
  const handleSaveEditedEmployee = () => {
    if (!editingEmployee) return
    
    const updatedEmployees = employees.map(emp => 
      emp.id === editingEmployee.id ? editingEmployee : emp
    )
    
    setEmployees(updatedEmployees)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updatedEmployees))
    }
    
    // 編集モードを終了
    setEditingEmployee(null)
    
    // 保存成功メッセージを表示
    setSaveSuccess(true)
  }
  
  // 編集のキャンセルハンドラ
  const handleCancelEdit = () => {
    setEditingEmployee(null)
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
  
  return (
    <DashboardLayout companyName={companyInfo.name}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">マイページ</h1>
            <p className="text-secondary-600">会社情報と従業員情報を管理します</p>
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
                  activeTab === 'company'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
                onClick={() => setActiveTab('company')}
              >
                会社情報
              </button>
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
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'company' ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-secondary-900">会社情報</h2>
                  {!isEditingCompany ? (
                    <button
                      onClick={() => setIsEditingCompany(true)}
                      className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition-colors"
                    >
                      編集
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveCompanyInfo}
                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setIsEditingCompany(false)}
                        className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingCompany ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                        会社名
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={companyInfo.name}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium text-secondary-700 mb-1">
                        業種
                      </label>
                      <input
                        type="text"
                        id="industry"
                        name="industry"
                        value={companyInfo.industry}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="size" className="block text-sm font-medium text-secondary-700 mb-1">
                        従業員規模
                      </label>
                      <input
                        type="text"
                        id="size"
                        name="size"
                        value={companyInfo.size}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-secondary-700 mb-1">
                        所在地
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={companyInfo.address}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="businessDescription" className="block text-sm font-medium text-secondary-700 mb-1">
                        事業内容
                      </label>
                      <textarea
                        id="businessDescription"
                        name="businessDescription"
                        value={companyInfo.businessDescription || ''}
                        onChange={handleCompanyInfoChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="foundedYear" className="block text-sm font-medium text-secondary-700 mb-1">
                        設立年
                      </label>
                      <input
                        type="text"
                        id="foundedYear"
                        name="foundedYear"
                        value={companyInfo.foundedYear || ''}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="website" className="block text-sm font-medium text-secondary-700 mb-1">
                        Webサイト
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        value={companyInfo.website || ''}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-secondary-700 mb-1">
                        連絡先メール
                      </label>
                      <input
                        type="email"
                        id="contactEmail"
                        name="contactEmail"
                        value={companyInfo.contactEmail || ''}
                        onChange={handleCompanyInfoChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-secondary-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-secondary-500">会社名</h3>
                        <p className="text-secondary-900">{companyInfo.name}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-secondary-500">業種</h3>
                        <p className="text-secondary-900">{companyInfo.industry}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-secondary-500">従業員規模</h3>
                        <p className="text-secondary-900">{companyInfo.size}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-secondary-500">所在地</h3>
                        <p className="text-secondary-900">{companyInfo.address}</p>
                      </div>
                      
                      {companyInfo.businessDescription && (
                        <div className="md:col-span-2">
                          <h3 className="text-sm font-medium text-secondary-500">事業内容</h3>
                          <p className="text-secondary-900">{companyInfo.businessDescription}</p>
                        </div>
                      )}
                      
                      {companyInfo.foundedYear && (
                        <div>
                          <h3 className="text-sm font-medium text-secondary-500">設立年</h3>
                          <p className="text-secondary-900">{companyInfo.foundedYear}</p>
                        </div>
                      )}
                      
                      {companyInfo.website && (
                        <div>
                          <h3 className="text-sm font-medium text-secondary-500">Webサイト</h3>
                          <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                            {companyInfo.website}
                          </a>
                        </div>
                      )}
                      
                      {companyInfo.contactEmail && (
                        <div>
                          <h3 className="text-sm font-medium text-secondary-500">連絡先メール</h3>
                          <a href={`mailto:${companyInfo.contactEmail}`} className="text-primary-600 hover:underline">
                            {companyInfo.contactEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-secondary-900">従業員情報</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          名前
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          役職
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          部署
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          時給（円）
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                            {employee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {employee.position}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {employee.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {employee.hourlyRate.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditEmployee(employee)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {editingEmployee ? (
                  <div className="mt-8 border-t border-secondary-200 pt-6">
                    <h3 className="text-md font-medium text-secondary-900 mb-4">従業員を編集</h3>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-secondary-700 mb-1">
                          名前
                        </label>
                        <input
                          type="text"
                          id="edit-name"
                          name="name"
                          value={editingEmployee.name}
                          onChange={handleEditEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-position" className="block text-sm font-medium text-secondary-700 mb-1">
                          役職
                        </label>
                        <input
                          type="text"
                          id="edit-position"
                          name="position"
                          value={editingEmployee.position}
                          onChange={handleEditEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-department" className="block text-sm font-medium text-secondary-700 mb-1">
                          部署
                        </label>
                        <input
                          type="text"
                          id="edit-department"
                          name="department"
                          value={editingEmployee.department}
                          onChange={handleEditEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-hourlyRate" className="block text-sm font-medium text-secondary-700 mb-1">
                          時給（円）
                        </label>
                        <input
                          type="number"
                          id="edit-hourlyRate"
                          name="hourlyRate"
                          value={editingEmployee.hourlyRate}
                          onChange={handleEditEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min="0"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2 flex space-x-4">
                        <button
                          type="button"
                          onClick={handleSaveEditedEmployee}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="mt-8 border-t border-secondary-200 pt-6">
                    <h3 className="text-md font-medium text-secondary-900 mb-4">従業員を追加</h3>
                    <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                          名前
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={newEmployee.name}
                          onChange={handleNewEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="position" className="block text-sm font-medium text-secondary-700 mb-1">
                          役職
                        </label>
                        <input
                          type="text"
                          id="position"
                          name="position"
                          value={newEmployee.position}
                          onChange={handleNewEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="department" className="block text-sm font-medium text-secondary-700 mb-1">
                          部署
                        </label>
                        <input
                          type="text"
                          id="department"
                          name="department"
                          value={newEmployee.department}
                          onChange={handleNewEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="hourlyRate" className="block text-sm font-medium text-secondary-700 mb-1">
                          時給（円）
                        </label>
                        <input
                          type="number"
                          id="hourlyRate"
                          name="hourlyRate"
                          value={newEmployee.hourlyRate}
                          onChange={handleNewEmployeeChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min="0"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                        >
                          追加
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
