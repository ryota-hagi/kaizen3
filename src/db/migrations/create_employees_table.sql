-- 従業員テーブルの作成
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  hourly_rate INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会社IDでインデックスを作成
CREATE INDEX IF NOT EXISTS employees_company_id_idx ON employees(company_id);

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
