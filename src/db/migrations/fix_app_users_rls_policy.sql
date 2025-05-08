-- app_usersテーブルの既存のRLSポリシーを削除
DROP POLICY IF EXISTS "ユーザーは自分自身と同じ会社のユーザーを閲覧" ON public.app_users;
DROP POLICY IF EXISTS "ユーザーは自分自身のレコードを閲覧できる" ON public.app_users;

-- 新しいRLSポリシーを作成
-- 1. ユーザーは自分自身のレコードを閲覧できる
CREATE POLICY "ユーザーは自分自身のレコードを閲覧できる" ON public.app_users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = auth_uid);

-- 2. ユーザーは同じ会社のユーザーを閲覧できる（app_membershipsテーブルを使用）
CREATE POLICY "ユーザーは同じ会社のユーザーを閲覧できる" ON public.app_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_memberships m1
      WHERE m1.auth_uid = auth.uid()::uuid
      AND EXISTS (
        SELECT 1 FROM public.app_memberships m2
        WHERE m2.auth_uid = app_users.auth_uid
        AND m2.company_id = m1.company_id
      )
    )
  );

-- 3. 管理者は同じ会社のユーザーを更新できる
CREATE POLICY "管理者は同じ会社のユーザーを更新できる" ON public.app_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_memberships m1
      WHERE m1.auth_uid = auth.uid()::uuid
      AND m1.role = '管理者'
      AND EXISTS (
        SELECT 1 FROM public.app_memberships m2
        WHERE m2.auth_uid = app_users.auth_uid
        AND m2.company_id = m1.company_id
      )
    )
  );

-- 4. 管理者は同じ会社のユーザーを削除できる
CREATE POLICY "管理者は同じ会社のユーザーを削除できる" ON public.app_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_memberships m1
      WHERE m1.auth_uid = auth.uid()::uuid
      AND m1.role = '管理者'
      AND EXISTS (
        SELECT 1 FROM public.app_memberships m2
        WHERE m2.auth_uid = app_users.auth_uid
        AND m2.company_id = m1.company_id
      )
    )
  );

-- 既存のapp_usersデータからapp_membershipsにデータを移行（まだ移行していない場合）
INSERT INTO public.app_memberships (auth_uid, company_id, role, created_at, updated_at)
SELECT auth_uid, company_id, role, created_at, updated_at
FROM public.app_users
WHERE company_id IS NOT NULL
AND auth_uid IS NOT NULL
ON CONFLICT (auth_uid, company_id) DO NOTHING;
