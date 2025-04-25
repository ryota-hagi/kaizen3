'use client'

import React, { useState } from 'react'
import { Employee } from '@/utils/api'

interface EmployeeListProps {
  employees: Employee[]
  onAdd: (employee: Omit<Employee, 'id'>) => void
  onEdit: (employee: Employee) => void
  onDelete: (id: string) => void
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ 
  employees, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id'>>({
    name: '',
    position: '',
    department: '',
    hourlyRate: 0
  })
  
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
    onAdd(newEmployee)
    
    // フォームをリセット
    setNewEmployee({
      name: '',
      position: '',
      department: '',
      hourlyRate: 0
    })
  }
  
  // 従業員の編集ハンドラ
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
  }
  
  // 編集した従業員の保存ハンドラ
  const handleSaveEditedEmployee = () => {
    if (!editingEmployee) return
    onEdit(editingEmployee)
    setEditingEmployee(null)
  }
  
  // 編集のキャンセルハンドラ
  const handleCancelEdit = () => {
    setEditingEmployee(null)
  }
  
  return (
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
                    onClick={() => onDelete(employee.id)}
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
  )
}
