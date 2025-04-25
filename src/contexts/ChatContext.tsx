'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ChatContextType {
  isOpen: boolean
  isExpanded: boolean
  setIsOpen: (isOpen: boolean) => void
  setIsExpanded: (isExpanded: boolean) => void
  toggleOpen: () => void
  toggleExpand: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // デフォルトでチャットを閉じた状態にする
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleOpen = () => setIsOpen(!isOpen)
  const toggleExpand = () => setIsExpanded(!isExpanded)

  return (
    <ChatContext.Provider value={{ isOpen, isExpanded, setIsOpen, setIsExpanded, toggleOpen, toggleExpand }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatContextProvider')
  }
  return context
}
