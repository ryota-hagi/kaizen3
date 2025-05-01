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
  // 静的生成から除外するページを指定
  exportPathMap: async function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    // 開発環境では全てのページを含める
    if (dev) {
      return defaultPathMap;
    }

    // 認証関連ページを除外
    const pathMap = { ...defaultPathMap };
    delete pathMap['/auth/callback'];
    delete pathMap['/auth/login'];
    delete pathMap['/auth/register/callback'];
    delete pathMap['/auth/register/check-user'];
    
    return pathMap;
  },
}

module.exports = nextConfig
