-- 従業員テーブル (employees) のポリシー作成

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS employees_select_policy ON employees;
DROP POLICY IF EXISTS employees_insert_policy ON employees;
DROP POLICY IF EXISTS employees_update_policy ON employees;
DROP POLICY IF EXISTS employees_delete_policy ON employees;

-- RLSポリシーの設定
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 同じ会社のユーザーのみが従業員情報を参照できるポリシー
CREATE POLICY employees_select_policy ON employees
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid()
    )
  );

-- 管理者のみが従業員情報を追加できるポリシー
CREATE POLICY employees_insert_policy ON employees
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid() AND role = '管理者'
    )
  );

-- 管理者のみが従業員情報を更新できるポリシー
CREATE POLICY employees_update_policy ON employees
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid() AND role = '管理者'
    )
  );

-- 管理者のみが従業員情報を削除できるポリシー
CREATE POLICY employees_delete_policy ON employees
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid() AND role = '管理者'
    )
  );

-- テンプレートテーブル (templates) のポリシー作成

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS templates_select_policy ON templates;
DROP POLICY IF EXISTS templates_insert_policy ON templates;
DROP POLICY IF EXISTS templates_update_policy ON templates;
DROP POLICY IF EXISTS templates_delete_policy ON templates;

-- RLSポリシーの設定
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 同じ会社のユーザーのみがテンプレート情報を参照できるポリシー
CREATE POLICY templates_select_policy ON templates
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid()
    )
  );

-- 同じ会社のユーザーがテンプレート情報を追加できるポリシー
CREATE POLICY templates_insert_policy ON templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid()
    )
  );

-- 同じ会社のユーザーがテンプレート情報を更新できるポリシー
CREATE POLICY templates_update_policy ON templates
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid()
    )
  );

-- 同じ会社のユーザーがテンプレート情報を削除できるポリシー
CREATE POLICY templates_delete_policy ON templates
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM app_memberships
      WHERE auth_uid = auth.uid()
    )
  );
