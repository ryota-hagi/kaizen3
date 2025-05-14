-- invitations_vビューのSECURITY DEFINERプロパティを修正

-- 既存のビューを削除
DROP VIEW IF EXISTS public.invitations_v;

-- SECURITY INVOKERを使用して安全なビューを再作成
CREATE VIEW public.invitations_v
WITH (security_invoker = true)
AS
SELECT 
  i.id,
  i.email,
  i.company_id,
  i.role,
  i.department,
  i.status,
  i.created_at,
  i.updated_at,
  i.token,
  i.expires_at,
  i.accepted_at,
  i.full_name,
  c.name as company_name
FROM 
  public.invitations i
LEFT JOIN 
  public.companies c ON i.company_id = c.id;

-- ビューに対するRLSポリシーを設定
GRANT SELECT ON public.invitations_v TO authenticated;
GRANT SELECT ON public.invitations_v TO anon;

COMMENT ON VIEW public.invitations_v IS 'セキュリティを強化した招待情報ビュー。SECURITY INVOKERを使用して、ビューを呼び出すユーザーの権限で実行します。';
