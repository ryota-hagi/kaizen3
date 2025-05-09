-- ワークフロー共同編集者テーブルのRLSを一時的に無効化
ALTER TABLE workflow_collaborators DISABLE ROW LEVEL SECURITY;

-- 全てのユーザーがワークフロー共同編集者テーブルにアクセスできるポリシーを作成
CREATE POLICY allow_all_workflow_collaborators ON workflow_collaborators
  FOR ALL
  TO authenticated
  USING (true);
