-- invitationsテーブルにfull_nameカラムを追加
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS full_name TEXT;
