'use client'

import { useEffect } from 'react'
import { redirect } from 'next/navigation'

export default function WorkflowsPage() {
  useEffect(() => {
    // クライアントサイドでのリダイレクト
    window.location.href = '/'
  }, [])
  
  // サーバーサイドでのリダイレクト
  redirect('/')
}
