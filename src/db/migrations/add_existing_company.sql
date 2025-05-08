-- 既存の会社情報をcompaniesテーブルに追加
INSERT INTO public.companies (id, name, industry, size, address, created_at, updated_at)
VALUES ('KZ-6PIFLNW', '株式会社ariGat', 'コンサル', '4人', '三重県', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  size = EXCLUDED.size,
  address = EXCLUDED.address,
  updated_at = NOW();

-- app_usersテーブルのRLSポリシーを修正
-- 無限再帰を避けるために、より単純なポリシーに変更
DROP POLICY IF EXISTS "ユーザーは自分自身と同じ会社のユーザーを閲覧" ON public.app_users;

CREATE POLICY "ユーザーは自分自身のレコードを閲覧できる" ON public.app_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_uid);

-- 一時的にRLSを無効化することも検討
-- ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
