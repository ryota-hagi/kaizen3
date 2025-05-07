-- app_usersテーブルの拡張
-- 既存のテーブルに新しいカラムを追加

-- 招待関連のカラムを追加
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS invited_by UUID,
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_app_users_company_id ON public.app_users(company_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON public.app_users(status);
