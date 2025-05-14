-- workflow_collaboratorsテーブルのRLSを有効化
ALTER TABLE public.workflow_collaborators ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを確認し、存在する場合は削除
DROP POLICY IF EXISTS allow_all_workflow_collaborators ON public.workflow_collaborators;

-- 適切なRLSポリシーを作成
-- 管理者用ポリシー
CREATE POLICY admin_all_workflow_collaborators ON public.workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.auth_uid = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- ワークフロー作成者用ポリシー
CREATE POLICY creator_workflow_collaborators ON public.workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows
      WHERE workflows.id = workflow_collaborators.workflow_id
      AND workflows.created_by = auth.uid()
    )
  );

-- 共同編集者自身がアクセスできるポリシー
CREATE POLICY collaborator_self_access ON public.workflow_collaborators
  FOR SELECT
  TO authenticated
  USING (
    workflow_collaborators.user_id = auth.uid()
  );

-- 同じ部署のマネージャーがアクセスできるポリシー
CREATE POLICY manager_department_workflow_collaborators ON public.workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.app_users creator ON creator.auth_uid = w.created_by
      JOIN public.app_users u ON u.auth_uid = auth.uid()
      WHERE w.id = workflow_collaborators.workflow_id
      AND u.role = 'manager'
      AND u.company_id = w.company_id
      AND u.department = creator.department
    )
  );
