-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS admin_all_workflows ON workflows;
DROP POLICY IF EXISTS manager_department_workflows ON workflows;
DROP POLICY IF EXISTS user_own_workflows ON workflows;
DROP POLICY IF EXISTS user_department_workflows ON workflows;

-- 管理者用ポリシー: 会社アカウントの全てのワークフローにアクセス可能
CREATE POLICY admin_all_workflows ON workflows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.auth_uid = auth.uid()
      AND app_users.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM app_users admin_user
        WHERE admin_user.auth_uid = auth.uid()
        AND workflows.company_id = admin_user.company_id
      )
    )
  );

-- 一般ユーザーとマネージャー共通ポリシー: 
-- 「全社共有」になっているワークフロー、自分の部署内共有に設定されているワークフロー、
-- 自分が作成したワークフロー、共同編集として招待されたワークフローが表示される
CREATE POLICY user_department_workflows ON workflows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users u
      WHERE u.auth_uid = auth.uid()
      AND u.role != 'admin'
      AND u.company_id = workflows.company_id
      AND (
        -- 全社共有のワークフロー
        workflows.access_level = 'company'
        OR
        -- 自分が作成したワークフロー
        workflows.created_by = u.id
        OR
        -- 自分の部署内共有のワークフロー
        (
          workflows.access_level = 'department'
          AND EXISTS (
            SELECT 1 FROM app_users creator
            WHERE creator.id = workflows.created_by
            AND creator.department = u.department
          )
        )
        OR
        -- 共同編集者として招待されたワークフロー
        EXISTS (
          SELECT 1 FROM workflow_collaborators
          WHERE workflow_collaborators.workflow_id = workflows.id
          AND workflow_collaborators.user_id = u.id
        )
      )
    )
  );
