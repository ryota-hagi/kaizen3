'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { UserInviteForm } from '@/components/auth/UserInviteForm'

interface UserInviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (message: string) => void
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // 画面サイズの変更を検知
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // md ブレークポイント
    }
    
    // 初期チェック
    checkIfMobile()
    
    // リサイズイベントのリスナーを追加
    window.addEventListener('resize', checkIfMobile)
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-10" 
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className={`flex min-h-full items-center justify-center ${isMobile ? 'p-0' : 'p-4'} text-center`}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className={`
                  w-full transform overflow-hidden bg-white text-left align-middle shadow-xl transition-all
                  ${isMobile ? 'h-full max-h-full rounded-none' : 'max-w-md rounded-2xl m-4'}
                  ${isMobile ? 'p-4' : 'p-6'}
                `}
              >
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-secondary-900"
                  >
                    ユーザーを招待
                  </Dialog.Title>
                  
                  {isMobile && (
                    <button
                      onClick={onClose}
                      className="text-secondary-400 hover:text-secondary-500 p-2"
                      aria-label="閉じる"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <div className={isMobile ? 'mt-2' : 'mt-4'}>
                  <UserInviteForm 
                    onClose={onClose} 
                    onError={(message) => {
                      // エラー時のみモーダルを閉じる
                      onClose();
                    }}
                  />
                </div>
                
                <div className={`${isMobile ? 'mt-4 flex justify-center' : 'mt-6 flex justify-end'}`}>
                  <button
                    onClick={onClose}
                    className={`
                      bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors
                      ${isMobile ? 'w-full py-3 text-center' : 'px-4 py-2'}
                    `}
                  >
                    閉じる
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
