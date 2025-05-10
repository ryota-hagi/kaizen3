'use client'

import { ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // ページの読み込み時にセッションを復元する処理
  useEffect(() => {
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined') {
      // セッションの復元を試みる
      const attemptSessionRestore = async () => {
        try {
          console.log('[Providers] Attempting to restore session on page load');
          
          // Supabaseクライアントを取得
          const client = supabase();
          
          // セッションの取得を試みる
          const { data: { session }, error } = await client.auth.getSession();
          
          if (error) {
            console.error('[Providers] Error getting session:', error);
            return;
          }
          
          if (session) {
            console.log('[Providers] Found existing session on page load');
            
            // セッションの有効期限を確認
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            
            if (expiresAt && expiresAt < now + 60) { // 有効期限が1分以内の場合は更新
              console.log('[Providers] Session about to expire, refreshing');
              
              try {
                // セッションの更新を試みる
                const { data, error } = await client.auth.refreshSession();
                
                if (error) {
                  console.error('[Providers] Failed to refresh session:', error);
                } else if (data.session) {
                  console.log('[Providers] Session refreshed successfully');
                }
              } catch (refreshError) {
                console.error('[Providers] Error refreshing session:', refreshError);
              }
            }
          } else {
            console.log('[Providers] No active session found on page load');
            
            // ローカルストレージからトークンを取得して復元を試みる
            try {
              const tokenStr = localStorage.getItem('supabase.auth.token');
              if (tokenStr) {
                console.log('[Providers] Found auth token in storage, attempting to restore');
                
                try {
                  const parsedToken = JSON.parse(tokenStr);
                  if (parsedToken?.access_token && parsedToken?.refresh_token) {
                    console.log('[Providers] Setting session from stored token');
                    
                    const { data, error } = await client.auth.setSession({
                      access_token: parsedToken.access_token,
                      refresh_token: parsedToken.refresh_token
                    });
                    
                    if (error) {
                      console.error('[Providers] Error restoring session from token:', error);
                      // 無効なトークンの場合はストレージから削除
                      localStorage.removeItem('supabase.auth.token');
                      try { sessionStorage.removeItem('supabase.auth.token'); } catch(e){}
                    } else if (data.session) {
                      console.log('[Providers] Successfully restored session from token');
                    }
                  }
                } catch (e) {
                  console.error('[Providers] Error parsing stored token:', e);
                }
              }
            } catch (storageError) {
              console.error('[Providers] Error accessing storage:', storageError);
            }
          }
        } catch (error) {
          console.error('[Providers] Error during session restore attempt:', error);
        }
      };
      
      // セッションの復元を試みる
      attemptSessionRestore();
      
      // ページの可視性変更イベントリスナーを追加
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('[Providers] Page became visible, checking session');
          attemptSessionRestore();
        }
      };
      
      // ページの可視性変更イベントリスナーを追加
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // クリーンアップ関数
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []); // 空の依存配列で一度だけ実行
  
  return <>{children}</>;
}
