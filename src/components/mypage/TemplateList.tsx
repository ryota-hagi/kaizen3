'use client'

import React, { useState } from 'react'

// テンプレートのインターフェース
interface Template {
  id: string
  title: string
  content: string
}

interface TemplateListProps {
  templates: Template[]
  onAdd: (template: Omit<Template, 'id'>) => void
  onEdit: (template: Template) => void
  onDelete: (id: string) => void
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [newTemplate, setNewTemplate] = useState<Omit<Template, 'id'>>({
    title: '',
    content: ''
  })
  
  // 新規テンプレートの変更ハンドラ
  const handleNewTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewTemplate(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // 編集中のテンプレートの変更ハンドラ
  const handleEditTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingTemplate) return
    
    const { name, value } = e.target
    setEditingTemplate(prev => ({
      ...prev!,
      [name]: value
    }))
  }
  
  // テンプレートの追加ハンドラ
  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(newTemplate)
    
    // フォームをリセット
    setNewTemplate({
      title: '',
      content: ''
    })
  }
  
  // テンプレートの編集ハンドラ
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
  }
  
  // 編集したテンプレートの保存ハンドラ
  const handleSaveEditedTemplate = () => {
    if (!editingTemplate) return
    onEdit(editingTemplate)
    setEditingTemplate(null)
  }
  
  // 編集のキャンセルハンドラ
  const handleCancelEdit = () => {
    setEditingTemplate(null)
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-secondary-900">テンプレート</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                タイトル
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                内容
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                  {template.title}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-500 max-w-xs truncate">
                  {template.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDelete(template.id)}
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
      
      {editingTemplate ? (
        <div className="mt-8 border-t border-secondary-200 pt-6">
          <h3 className="text-md font-medium text-secondary-900 mb-4">テンプレートを編集</h3>
          <form className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-secondary-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                id="edit-title"
                name="title"
                value={editingTemplate.title}
                onChange={handleEditTemplateChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="edit-content" className="block text-sm font-medium text-secondary-700 mb-1">
                内容
              </label>
              <textarea
                id="edit-content"
                name="content"
                value={editingTemplate.content}
                onChange={handleEditTemplateChange}
                rows={6}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleSaveEditedTemplate}
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
          <h3 className="text-md font-medium text-secondary-900 mb-4">テンプレートを追加</h3>
          <form onSubmit={handleAddTemplate} className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={newTemplate.title}
                onChange={handleNewTemplateChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-secondary-700 mb-1">
                内容
              </label>
              <textarea
                id="content"
                name="content"
                value={newTemplate.content}
                onChange={handleNewTemplateChange}
                rows={6}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
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
