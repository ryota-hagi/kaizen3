'use client'

import React, { useState } from 'react'
import { CompanyInfo as CompanyInfoType } from '@/utils/api'

interface CompanyInfoProps {
  companyInfo: CompanyInfoType
  onSave: (companyInfo: CompanyInfoType) => void
  isEditable?: boolean
}

export const CompanyInfo: React.FC<CompanyInfoProps> = ({ companyInfo, onSave, isEditable = true }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedInfo, setEditedInfo] = useState<CompanyInfoType>(companyInfo)
  
  // 会社情報の変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditedInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // 保存ハンドラ
  const handleSave = () => {
    onSave(editedInfo)
    setIsEditing(false)
  }
  
  // キャンセルハンドラ
  const handleCancel = () => {
    setEditedInfo(companyInfo)
    setIsEditing(false)
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-secondary-900">会社情報</h2>
        {isEditable && !isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition-colors"
          >
            編集
          </button>
        ) : isEditing ? (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        ) : null}
      </div>
      
      {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
              会社名
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={editedInfo.name}
              onChange={handleChange}
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
              value={editedInfo.industry}
              onChange={handleChange}
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
              value={editedInfo.size}
              onChange={handleChange}
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
              value={editedInfo.address}
              onChange={handleChange}
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
              value={editedInfo.businessDescription || ''}
              onChange={handleChange}
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
              value={editedInfo.foundedYear || ''}
              onChange={handleChange}
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
              value={editedInfo.website || ''}
              onChange={handleChange}
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
              value={editedInfo.contactEmail || ''}
              onChange={handleChange}
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
  )
}
