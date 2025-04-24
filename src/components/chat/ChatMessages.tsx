'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  messagesEndRef
}) => {
  return (
    <div className="chat-messages bg-gradient-to-br from-blue-50 to-white p-4 space-y-4 overflow-y-auto flex-1">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          } mb-4`}
        >
          {message.sender === 'assistant' && (
            <div className="flex-shrink-0 mr-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>
          )}
          
          <div
            className={`chat-message ${
              message.sender === 'user' 
                ? 'chat-message-user bg-gradient-to-r from-primary-500 to-blue-600 text-white shadow-md' 
                : 'chat-message-assistant bg-white border border-secondary-200 shadow-md'
            } max-w-[80%] rounded-2xl px-4 py-3`}
          >
            {message.sender === 'user' ? (
              <div className="text-sm">{message.content}</div>
            ) : (
              <div className="text-sm markdown-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            <div className={`text-xs ${message.sender === 'user' ? 'text-blue-100' : 'text-secondary-400'} mt-1 text-right`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          {message.sender === 'user' && (
            <div className="flex-shrink-0 ml-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="flex-shrink-0 mr-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
          <div className="chat-message chat-message-assistant bg-white border border-secondary-200 shadow-md max-w-[80%] rounded-2xl px-4 py-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  )
}
