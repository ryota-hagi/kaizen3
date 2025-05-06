'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext/context'
import { supabase, createAppUsersTable, saveUserToDatabase, getUserFromDatabase } from '@/lib/supabaseClient'
import { createCompaniesTable } from '@/lib/createCompaniesTable'

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        
        // Supabaseのセッションを取得
        const client = supabase()
        const { data, error } = await client.auth.getSession()
        
        if (error) {
          console.error('[DEBUG] Error getting session:', error)
          setError('認証中にエラーが発生しました')
          setLoading(false)
          return
        }
        
        if (!data.session) {
          console.error('[DEBUG] No session found')
          setError('セッションが見つかりません')
          setLoading(false)
          return
        }
        
        // ユーザー情報を取得
        const { data: { user }, error: userError } = await client.auth.getUser()
        
        if (userError || !user) {
          console.error('[DEBUG] Error getting user:', userError)
          setError('ユーザー情報の取得に失敗しました')
          setLoading(false)
          return
        }
        
        console.log('[DEBUG] Authenticated user email:', user.email)
        
        // 必要なテーブルが存在するか確認し、なければ作成
        try {
          // app_usersテーブルの作成
          const { success: userTableSuccess, error: userTableError } = await createAppUsersTable()
          if (!userTableSuccess) {
            console.error('[DEBUG] Error creating app_users table:', userTableError)
          }
          
          // companiesテーブルの作成
          const { success: companyTableSuccess, error: companyTableError } = await createCompaniesTable()
          if (!companyTableSuccess) {
            console.error('[DEBUG] Error creating companies table:', companyTableError)
          } else {
            console.log('[DEBUG] Companies table check/creation completed successfully')
          }
        } catch (tableError) {
          console.error('[DEBUG] Exception creating tables:', tableError)
        }
        
        // 通常のログイン
        const success = await loginWithGoogle()
        
        if (success) {
          // ユーザーが既存かどうかを確認
          const { data: { user } } = await client.auth.getUser()
          
          if (!user) {
            setError('ユーザー情報の取得に失敗しました')
            setLoading(false)
            return
          }
          
          // Supabaseのユーザーメタデータから会社IDを取得
          const companyIdFromMetadata = user.user_metadata?.company_id
          
          // app_usersテーブルにユーザー情報が存在するか確認
          try {
            const result = await getUserFromDatabase(user.id)
            
            if (!result.success || !result.data) {
              console.log('[DEBUG] User not found in database, creating new record')
              
              // ユーザー情報をデータベースに保存
              const saveResult = await saveUserToDatabase(user.id, {
                email: user.email || '',
                fullName: user.user_metadata?.full_name || '',
                role: user.user_metadata?.role || '一般ユーザー',
                status: 'アクティブ',
                createdAt: user.created_at,
                companyId: companyIdFromMetadata || ''
              })
              
              if (!saveResult.success) {
                console.error('[DEBUG] Error saving user to database:', saveResult.error)
                // エラーがあっても処理を続行
              }
            } else {
              console.log('[DEBUG] User found in database:', result.data)
            }
          } catch (dbError) {
            console.error('[DEBUG] Database operation error:', dbError)
            // データベースエラーがあっても認証フローを続行
          }
          
        if (companyIdFromMetadata) {
          // 会社IDがある場合はダッシュボードへ
          console.log('[DEBUG] Redirecting to dashboard with company ID:', companyIdFromMetadata)
          router.push('/dashboard')
        } else {
          // 会社IDがない場合は会社登録ページへ
          console.log('[DEBUG] Redirecting to company registration page')
          router.push('/auth/register/company')
        }
        } else {
          setError('ログインに失敗しました')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('認証処理中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    
    handleCallback()
  }, [router, searchParams, loginWithGoogle])
  
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
