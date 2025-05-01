'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppMyPage() {
  const router = useRouter()
  
  useEffect(() => {
    // 正しいパスにリダイレクト
    router.replace('/mypage')
  }, [router])
  
  // リダイレクト中の表示
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  )
}
