import { Suspense } from 'react'
import CallbackInner from './CallbackInner'

// プリレンダを強制的にオフ
export const dynamic = 'force-dynamic'

// ローディング表示用のフォールバックコンポーネント
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-secondary-900 mb-6">
          読み込み中...
        </h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-secondary-600">
            ページを準備しています...
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackInner />
    </Suspense>
  )
}
