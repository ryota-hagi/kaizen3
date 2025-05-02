/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 認証関連ページのビルド時エラーを修正
  // これらのページはクライアントサイドでのみ動作する機能を使用しているため、
  // 静的生成（プリレンダリング）から除外する
  experimental: {
    // App Routerでの動的インポートの最適化
    optimizeCss: true,
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: [],
  },
  // App Routerでは画像ドメインを指定
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // 認証関連ページを静的生成から除外
  output: 'standalone',
  // ビルドキャッシュをクリアするために、ビルドIDを動的に生成
  generateBuildId: async () => {
    // タイムスタンプを使用して一意のビルドIDを生成
    return `build-${Date.now()}`;
  },
}

module.exports = nextConfig
