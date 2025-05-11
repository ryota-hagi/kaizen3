'use client'

import React, { useEffect } from 'react'
import { supabase, validateSession } from '@/lib/supabaseClient'

export function Providers({ children }: { children: React.ReactNode }) {
  // グローバルなセッション復元ロジック
  useEffect(() => {
    // ページロード時にセッションを検証
    const checkSession = async () => {
      try {
        console.log('[Providers] Validating session on page load');
        const { valid, session } = await validateSession();
        
        if (valid && session) {
          console.log('[Providers] Valid session found on page load');
        } else {
          console.log('[Providers] No valid session found on page load');
        }
      } catch (error) {
        console.error('[Providers] Error validating session:', error);
      }
    };
    
    checkSession();
    
    // ページの可視性変更イベントリスナーを追加
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Providers] Page became visible, checking session');
        checkSession();
      }
    };
    
    // ページの可視性変更イベントリスナーを追加
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // クリーンアップ関数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return (
    <>
      {children}
    </>
  )
}
