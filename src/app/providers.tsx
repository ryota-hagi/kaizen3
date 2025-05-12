'use client'

import React from 'react'
import { initializeAuth } from '@/lib/supabaseClient'

export function Providers({ children }: { children: React.ReactNode }) {
  // グローバルなセッション初期化（最小限の処理に変更）
  React.useEffect(() => {
    // アプリケーション起動時に一度だけ認証状態を初期化
    const initAuth = async () => {
      await initializeAuth();
    };
    
    initAuth();
  }, []);
  
  return (
    <>
      {children}
    </>
  )
}
