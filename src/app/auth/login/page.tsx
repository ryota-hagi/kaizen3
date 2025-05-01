import { Suspense } from 'react'
import LoginInner from './LoginInner'

// プリレンダを強制的にオフ
export const dynamic = 'force-dynamic'

// ローディング表示用のフォールバックコンポーネント
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
          KAIZEN
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          読み込み中...
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-secondary-600">
              ページを準備しています...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginInner />
    </Suspense>
  )
}
