'use client'

import React from 'react'

interface SuccessMessageProps {
  show: boolean
  message: string
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ show, message }) => {
  if (!show) return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
      <div className="flex items-center">
        <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  )
}
