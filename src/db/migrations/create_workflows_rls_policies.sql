-- ワークフローテーブルのRLSを有効化
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- ワークフロー履歴テーブルのRLSを有効化
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

-- ワークフロー共同編集者テーブルのRLSを有効化
ALTER TABLE workflow_collaborators ENABLE ROW LEVEL SECURITY;

-- 管理者用ポリシー: 全てのワークフローにアクセス可能
CREATE POLICY admin_all_workflows ON workflows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.auth_uid = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- マネージャー用ポリシー: 自部署のワークフローにアクセス可能
CREATE POLICY manager_department_workflows ON workflows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users u
      JOIN app_users creator ON creator.auth_uid = workflows.created_by
      WHERE u.auth_uid = auth.uid()
      AND u.role = 'manager'
      AND u.company_id = workflows.company_id
      AND u.department = creator.department
    )
    OR
    (
      -- 部署公開のワークフローにアクセス可能
      workflows.access_level = 'department'
      AND EXISTS (
        SELECT 1 FROM app_users u
        JOIN app_users creator ON creator.auth_uid = workflows.created_by
        WHERE u.auth_uid = auth.uid()
        AND u.role = 'manager'
        AND u.company_id = workflows.company_id
        AND u.department = creator.department
      )
    )
    OR
    (
      -- 会社公開のワークフローにアクセス可能
      workflows.access_level = 'company'
      AND EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.auth_uid = auth.uid()
        AND app_users.company_id = workflows.company_id
      )
    )
  );

-- 一般ユーザー用ポリシー: 自分が作成したワークフローにアクセス可能
CREATE POLICY user_own_workflows ON workflows
  FOR ALL
  TO authenticated
  USING (
    workflows.created_by = auth.uid()
    OR
    (
      -- 部署公開のワークフローにアクセス可能
      workflows.access_level = 'department'
      AND EXISTS (
        SELECT 1 FROM app_users u
        JOIN app_users creator ON creator.auth_uid = workflows.created_by
        WHERE u.auth_uid = auth.uid()
        AND u.company_id = workflows.company_id
        AND u.department = creator.department
      )
    )
    OR
    (
      -- 会社公開のワークフローにアクセス可能
      workflows.access_level = 'company'
      AND EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.auth_uid = auth.uid()
        AND app_users.company_id = workflows.company_id
      )
    )
    OR
    (
      -- 共同編集者として追加されている場合
      EXISTS (
        SELECT 1 FROM workflow_collaborators
        WHERE workflow_collaborators.workflow_id = workflows.id
        AND workflow_collaborators.user_id = auth.uid()
      )
    )
  );

-- ワークフロー履歴テーブルのポリシー
CREATE POLICY admin_all_workflow_history ON workflow_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.auth_uid = auth.uid()
      AND app_users.role = 'admin'
    )
  );

CREATE POLICY user_own_workflow_history ON workflow_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_history.workflow_id
      AND (
        workflows.created_by = auth.uid()
        OR
        (
          -- 部署公開のワークフローの履歴を閲覧可能
          workflows.access_level = 'department'
          AND EXISTS (
            SELECT 1 FROM app_users u
            JOIN app_users creator ON creator.auth_uid = workflows.created_by
            WHERE u.auth_uid = auth.uid()
            AND u.company_id = workflows.company_id
            AND u.department = creator.department
          )
        )
        OR
        (
          -- 会社公開のワークフローの履歴を閲覧可能
          workflows.access_level = 'company'
          AND EXISTS (
            SELECT 1 FROM app_users
            WHERE app_users.auth_uid = auth.uid()
            AND app_users.company_id = workflows.company_id
          )
        )
        OR
        (
          -- 共同編集者として追加されている場合
          EXISTS (
            SELECT 1 FROM workflow_collaborators
            WHERE workflow_collaborators.workflow_id = workflows.id
            AND workflow_collaborators.user_id = auth.uid()
          )
        )
      )
    )
  );

-- ワークフロー共同編集者テーブルのポリシー
CREATE POLICY admin_all_workflow_collaborators ON workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.auth_uid = auth.uid()
      AND app_users.role = 'admin'
    )
  );

CREATE POLICY manager_department_workflow_collaborators ON workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN app_users creator ON creator.auth_uid = w.created_by
      JOIN app_users u ON u.auth_uid = auth.uid()
      WHERE w.id = workflow_collaborators.workflow_id
      AND u.role = 'manager'
      AND u.company_id = w.company_id
      AND u.department = creator.department
    )
  );

CREATE POLICY user_own_workflow_collaborators ON workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_collaborators.workflow_id
      AND workflows.created_by = auth.uid()
    )
  );

CREATE POLICY user_view_workflow_collaborators ON workflow_collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_collaborators.workflow_id
      AND (
        -- 部署公開のワークフローの共同編集者を閲覧可能
        workflows.access_level = 'department'
        AND EXISTS (
          SELECT 1 FROM app_users u
          JOIN app_users creator ON creator.auth_uid = workflows.created_by
          WHERE u.auth_uid = auth.uid()
          AND u.company_id = workflows.company_id
          AND u.department = creator.department
        )
        OR
        -- 会社公開のワークフローの共同編集者を閲覧可能
        workflows.access_level = 'company'
        AND EXISTS (
          SELECT 1 FROM app_users
          WHERE app_users.auth_uid = auth.uid()
          AND app_users.company_id = workflows.company_id
        )
        OR
        -- 共同編集者として追加されている場合
        EXISTS (
          SELECT 1 FROM workflow_collaborators
          WHERE workflow_collaborators.workflow_id = workflows.id
          AND workflow_collaborators.user_id = auth.uid()
        )
      )
    )
  );
