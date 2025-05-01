'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, updateUserAfterGoogleSignIn, users } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        
        // Supabaseのセッションを取得
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setError('認証中にエラーが発生しました')
          setLoading(false)
          return
        }
        
        if (!data.session) {
          console.error('No session found')
          setError('セッションが見つかりません')
          setLoading(false)
          return
        }
        
        // 招待ユーザーかどうかを確認
        const isInvited = searchParams?.get('invite') === 'true'
        
        // トークンと会社IDを取得（URLパラメータ、セッションストレージ、ローカルストレージの順に確認）
        const urlToken = searchParams?.get('token')
        const sessionToken = sessionStorage.getItem('invite_token')
        const localToken = localStorage.getItem('invite_token')
        const inviteToken = urlToken || sessionToken || localToken
        
        // 会社IDを取得
        const urlCompanyId = searchParams?.get('companyId')
        const sessionCompanyId = sessionStorage.getItem('invite_company_id')
        const localCompanyId = localStorage.getItem('invite_company_id')
        const companyIdFromUrl = urlCompanyId || sessionCompanyId || localCompanyId
        
        console.log('[DEBUG] Is invited user:', isInvited)
        console.log('[DEBUG] URL token:', urlToken)
        console.log('[DEBUG] Session token:', sessionToken)
        console.log('[DEBUG] Local token:', localToken)
        console.log('[DEBUG] Using token:', inviteToken)
        console.log('[DEBUG] URL companyId:', urlCompanyId)
        console.log('[DEBUG] Session companyId:', sessionCompanyId)
        console.log('[DEBUG] Local companyId:', localCompanyId)
        console.log('[DEBUG] Using companyId:', companyIdFromUrl)
        console.log('[DEBUG] Total users in context:', users.length)
        
        // 全ユーザーのトークンをログに出力
        users.forEach((user, index) => {
          console.log(`[DEBUG] User ${index} token:`, user.inviteToken, 'isInvited:', user.isInvited, 'status:', user.status, 'companyId:', user.companyId || 'not set')
        })
        
        if (isInvited) {
          // 招待ユーザーの場合
          console.log('[DEBUG] Processing invited user login')
          
          if (!inviteToken) {
            console.error('No invite token found')
            setError('招待トークンが見つかりません。招待メールのリンクから再度アクセスしてください。')
            setLoading(false)
            return
          }
          
          // 招待ユーザーを検索（大文字小文字を区別せず比較）
          const invitedUsers = users.filter(user => 
            user.inviteToken && 
            user.inviteToken.toLowerCase() === inviteToken.toLowerCase() &&
            (user.isInvited === true || user.status === '招待中')
          )
          
          console.log('[DEBUG] Found invited users:', invitedUsers.length)
          
          if (invitedUsers.length === 0) {
            // トークンのみで検索（会社IDやステータスを考慮しない）
            const usersByTokenOnly = users.filter(user => 
              user.inviteToken && 
              user.inviteToken.toLowerCase() === inviteToken.toLowerCase()
            )
            
            console.log('[DEBUG] Found users by token only:', usersByTokenOnly.length)
            
            if (usersByTokenOnly.length > 0) {
              // トークンのみで一致するユーザーが見つかった場合
              const userByToken = usersByTokenOnly[0]
              console.log('[DEBUG] Using user found by token only:', userByToken.email)
              
              // 会社IDを取得（ユーザーの会社IDまたは他のユーザーから）
              let companyId = userByToken.companyId
              
              if (!companyId || companyId.trim() === '') {
                // 他のユーザーから会社IDを取得
                const otherUser = users.find(u => u.companyId && u.companyId.trim() !== '')
                if (otherUser) {
                  companyId = otherUser.companyId
                  console.log('[DEBUG] Using company ID from other user:', companyId)
                } else {
                  console.error('[DEBUG] No company ID found')
                  setError('会社情報が見つかりません。')
                  setLoading(false)
                  return
                }
              }
              
              // ユーザー情報を更新
              const success = await updateUserAfterGoogleSignIn({
                isInvited: true,
                inviteToken,
                role: userByToken.role || 'メンバー',
                companyId
              })
              
              if (success) {
                // 招待トークンをクリア
                sessionStorage.removeItem('invite_token')
                localStorage.removeItem('invite_token')
                
                // ダッシュボードにリダイレクト
                router.push('/dashboard')
              } else {
                setError('ユーザー情報の更新に失敗しました')
              }
              return
            }
            
            // ユーザー管理画面のユーザーリストを直接確認
            console.log('[DEBUG] Checking localStorage directly for invited users')
            try {
              const savedUsers = localStorage.getItem('kaizen_users')
              if (savedUsers) {
                const parsedData = JSON.parse(savedUsers)
                console.log('[DEBUG] Found users in localStorage:', parsedData.length)
                
                // 招待中のユーザーを検索
                const storedInvitedUsers = parsedData.filter((item: any) => 
                  item.user && 
                  item.user.inviteToken && 
                  item.user.inviteToken.toLowerCase() === inviteToken.toLowerCase() &&
                  (item.user.isInvited === true || item.user.status === '招待中')
                )
                
                console.log('[DEBUG] Found invited users in localStorage:', storedInvitedUsers.length)
                
                if (storedInvitedUsers.length > 0) {
                  const storedInvitedUser = storedInvitedUsers[0].user
                  console.log('[DEBUG] Using invited user from localStorage:', storedInvitedUser.email)
                  
                  // 会社IDを取得
                  let companyId = storedInvitedUser.companyId
                  
                  if (!companyId || companyId.trim() === '') {
                    // 他のユーザーから会社IDを取得
                    const otherStoredUser = parsedData.find((item: any) => 
                      item.user && item.user.companyId && item.user.companyId.trim() !== ''
                    )
                    
                    if (otherStoredUser) {
                      companyId = otherStoredUser.user.companyId
                      console.log('[DEBUG] Using company ID from other stored user:', companyId)
                    } else {
                      console.error('[DEBUG] No company ID found in localStorage')
                      setError('会社情報が見つかりません。')
                      setLoading(false)
                      return
                    }
                  }
                  
                  // ユーザー情報を更新
                  const success = await updateUserAfterGoogleSignIn({
                    isInvited: true,
                    inviteToken,
                    role: storedInvitedUser.role || 'メンバー',
                    companyId
                  })
                  
                  if (success) {
                    // 招待トークンをクリア
                    sessionStorage.removeItem('invite_token')
                    localStorage.removeItem('invite_token')
                    
                    // ダッシュボードにリダイレクト
                    router.push('/dashboard')
                    return
                  } else {
                    setError('ユーザー情報の更新に失敗しました')
                    return
                  }
                }
              }
            } catch (e) {
              console.error('[DEBUG] Error checking localStorage:', e)
            }
            
            console.error('[DEBUG] No invited user found with token:', inviteToken)
            setError('招待ユーザーが見つかりません。招待メールのリンクから再度アクセスしてください。')
            setLoading(false)
            return
          }
          
          // 最初に見つかった招待ユーザーを使用
          const invitedUser = invitedUsers[0]
          console.log('[DEBUG] Using invited user:', invitedUser.email, 'with company ID:', invitedUser.companyId || 'not set')
          
          // 会社IDを取得（URLパラメータ優先、次にユーザーの会社ID、最後に他のユーザーから）
          let companyId = companyIdFromUrl || invitedUser.companyId
          
          if (!companyId || companyId.trim() === '') {
            console.log('[DEBUG] No company ID found for invited user, searching for company ID from other users')
            
            // 他のユーザーから会社IDを取得
            const otherUser = users.find(u => u.companyId && u.companyId.trim() !== '')
            if (otherUser) {
              companyId = otherUser.companyId
              console.log('[DEBUG] Using company ID from other user:', companyId)
            } else {
              console.error('[DEBUG] No company ID found')
              setError('招待ユーザーの会社情報が見つかりません。')
              setLoading(false)
              return
            }
          }
          
          console.log('[DEBUG] Using company ID:', companyId)
          
          // ユーザー情報を更新
          const success = await updateUserAfterGoogleSignIn({
            isInvited: true,
            inviteToken,
            role: invitedUser.role || 'メンバー',
            companyId
          })
          
          if (success) {
            // 招待トークンをクリア
            sessionStorage.removeItem('invite_token')
            localStorage.removeItem('invite_token')
            
            // ダッシュボードにリダイレクト
            router.push('/dashboard')
          } else {
            setError('ユーザー情報の更新に失敗しました')
          }
        } else {
          // 通常のログイン
          const success = await loginWithGoogle()
          
          if (success) {
            // ユーザーが既存かどうかを確認
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
              setError('ユーザー情報の取得に失敗しました')
              setLoading(false)
              return
            }
            
            // ローカルストレージからユーザーリストを取得
            const usersJson = localStorage.getItem('kaizen_users')
            const localUsers = usersJson ? JSON.parse(usersJson) : []
            
            // ユーザーが既存かどうかを確認（ユーザーIDで検索）
            const existingUser = localUsers.find((u: any) => u.user && u.user.id === user.id)
            
            if (existingUser && existingUser.user.companyId) {
              // 既存ユーザーで会社IDがある場合はダッシュボードへ
              router.push('/dashboard')
            } else {
              // 新規ユーザーまたは会社IDがない場合は会社登録ページへ
              router.push('/auth/register/company')
            }
          } else {
            setError('ログインに失敗しました')
          }
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('認証処理中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    
    handleCallback()
  }, [router, searchParams, loginWithGoogle, updateUserAfterGoogleSignIn, users])
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
            エラーが発生しました
          </h1>
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              ログインページに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          認証処理中...
        </h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-secondary-600">
            認証情報を処理しています...
          </p>
        </div>
      </div>
    </div>
  )
}
