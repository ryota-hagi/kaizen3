-- invitationsテーブルの完全なマイグレーション
-- 不足しているカラムを追加し、カラム名の不一致を修正

-- invited_byカラムの追加
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS invited_by UUID;

-- expires_atカラムの追加
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- accepted_atカラムの追加
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- tokenカラムの追加（invite_tokenと同期）
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS token TEXT;

-- full_nameカラムの追加
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 既存のinvite_tokenの値をtokenにコピー
UPDATE public.invitations
SET token = invite_token
WHERE token IS NULL AND invite_token IS NOT NULL;

-- tokenにUNIQUE制約を追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_token_key'
  ) THEN
    ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);
  END IF;
END $$;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
