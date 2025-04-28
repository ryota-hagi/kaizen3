import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * セッションのユーザーオブジェクトに追加のプロパティを定義
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * JWTトークンに追加のプロパティを定義
   */
  interface JWT {
    id?: string;
  }
}
