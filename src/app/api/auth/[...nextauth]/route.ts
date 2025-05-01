import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  providers: [
    // Google認証プロバイダー
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    
    // ユーザー名とパスワードでのログインを追加
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "ユーザーID", type: "text" },
        password: { label: "パスワード", type: "password" }
      },
      async authorize(credentials) {
        // ここでは簡易的な認証を行う
        // 実際のアプリケーションでは、データベースなどで認証を行う
        if (credentials?.username === "admin" && credentials?.password === "admin123") {
          return {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
          };
        }
        if (credentials?.username === "user" && credentials?.password === "user123") {
          return {
            id: "2",
            name: "Regular User",
            email: "user@example.com",
          };
        }
        return null;
      }
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async session({ session, token }) {
      // セッションにユーザーIDを追加
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      // 初回ログイン時にユーザー情報をトークンに追加
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      // ユーザーがログインしたときに呼び出される
      // 同じGoogleアカウントが複数の会社で登録されることを防止
      // 既に登録されているGoogleアカウントの場合は、新規登録ではなくログインフローに切り替える
      if (account?.provider === 'google' && user?.email) {
        // クライアントサイドでチェックするため、ここでは常に許可
        return true;
      }
      return true; // その他のプロバイダーも許可
    },
    async redirect({ url, baseUrl }) {
      // 既存のユーザーかどうかをチェックし、適切なリダイレクト先を決定
      // 新規登録フローの場合はユーザーチェックページへ
      // 既存ユーザーの場合はダッシュボードへ
      if (url.startsWith('/auth/register/check-user') || url.startsWith('/auth/register/company')) {
        return url;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    }
  },
});

export { handler as GET, handler as POST };
