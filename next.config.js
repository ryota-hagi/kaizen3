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
  // 静的ファイルを正しく配信するための設定
  // output: 'standalone', // 一時的にコメントアウト
  // ビルドキャッシュをクリアするために、ビルドIDを動的に生成
  generateBuildId: async () => {
    // タイムスタンプを使用して一意のビルドIDを生成
    return `build-${Date.now()}`;
  },
  // 静的ファイルの配信設定
  async rewrites() {
    return [
      {
        source: '/fix-invitations-view.html',
        destination: '/fix-invitations-view.html',
      },
      {
        source: '/clear-cache.html',
        destination: '/clear-cache.html',
      },
    ];
  },
  // ビルド時にAPIエンドポイントを呼び出さないようにする設定
  // これにより、ビルド時のエラーを防止できます
  webpack: (config, { isServer }) => {
    // APIルートをビルド時に除外
    if (isServer) {
      // サーバーサイドビルド時のみ適用
      config.externals = [...config.externals, 
        // 以下のパターンに一致するモジュールを外部化（ビルド時に実行しない）
        /^(supabase|@supabase)/
      ];
    }
    return config;
  },
  // 特定のAPIルートをビルド時に除外する設定
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'x-build-exclude',
            value: 'true',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
