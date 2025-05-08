-- invitationsテーブルのRLSポリシーを設定
-- 既存のポリシーを削除してから新しいポリシーを作成

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "管理者は全ての招待を読み取れる" ON public.invitations;
DROP POLICY IF EXISTS "管理者は招待を作成できる" ON public.invitations;
DROP POLICY IF EXISTS "管理者は招待を更新できる" ON public.invitations;
DROP POLICY IF EXISTS "マネージャーは自社の招待を読み取れる" ON public.invitations;
DROP POLICY IF EXISTS "マネージャーは自社の招待を作成できる" ON public.invitations;
DROP POLICY IF EXISTS "招待されたユーザーは自分宛ての招待を読み取れる" ON public.invitations;
DROP POLICY IF EXISTS "招待されたユーザーは自分の招待を更新できる" ON public.invitations;
DROP POLICY IF EXISTS "招待トークンによる検証" ON public.invitations;
DROP POLICY IF EXISTS "invitations_select_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON public.invitations;

-- RLSを有効化
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 管理者は全ての招待を読み取り、作成、更新できる
CREATE POLICY "管理者は全ての招待を読み取れる" ON public.invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() AND app_users.role = '管理者'
    )
  );

CREATE POLICY "管理者は招待を作成できる" ON public.invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() AND app_users.role = '管理者'
    )
  );

CREATE POLICY "管理者は招待を更新できる" ON public.invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() AND app_users.role = '管理者'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() AND app_users.role = '管理者'
    )
  );

CREATE POLICY "管理者は招待を削除できる" ON public.invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() AND app_users.role = '管理者'
    )
  );

-- マネージャーは自社の招待を読み取り、作成できる
CREATE POLICY "マネージャーは自社の招待を読み取れる" ON public.invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() 
      AND app_users.role = 'マネージャー'
      AND app_users.company_id = invitations.company_id
    )
  );

CREATE POLICY "マネージャーは自社の招待を作成できる" ON public.invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() 
      AND app_users.role = 'マネージャー'
      AND app_users.company_id = invitations.company_id
    )
  );

CREATE POLICY "マネージャーは自社の招待を更新できる" ON public.invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() 
      AND app_users.role = 'マネージャー'
      AND app_users.company_id = invitations.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid() 
      AND app_users.role = 'マネージャー'
      AND app_users.company_id = invitations.company_id
    )
  );

-- 招待されたユーザーは自分宛ての招待を読み取れる
CREATE POLICY "招待されたユーザーは自分宛ての招待を読み取れる" ON public.invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.email = invitations.email
      AND auth.users.id = auth.uid()
    )
  );

-- 招待されたユーザーは自分の招待を更新できる（招待を受け入れる場合）
CREATE POLICY "招待されたユーザーは自分の招待を更新できる" ON public.invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.email = invitations.email
      AND auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.email = invitations.email
      AND auth.users.id = auth.uid()
    )
  );

-- 招待トークンによる検証のための匿名アクセスポリシー
CREATE POLICY "招待トークンによる検証" ON public.invitations
  FOR SELECT
  USING (
    auth.role() = 'anon' AND
    invitations.token IS NOT NULL AND
    invitations.accepted_at IS NULL AND
    (invitations.expires_at IS NULL OR invitations.expires_at > NOW())
  );
