-- テンプレートテーブルの作成
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会社IDでインデックスを作成
CREATE INDEX IF NOT EXISTS templates_company_id_idx ON templates(company_id);

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
