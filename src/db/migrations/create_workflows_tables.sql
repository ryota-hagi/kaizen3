-- ワークフローテーブルの作成
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_improved BOOLEAN DEFAULT FALSE,
  original_id UUID REFERENCES workflows(id),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  access_level TEXT DEFAULT 'user',
  is_public BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1
);

-- ワークフロー履歴テーブルの作成
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ワークフロー共同編集者テーブルの作成
CREATE TABLE IF NOT EXISTS workflow_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  permission_type TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(workflow_id, user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS workflows_created_by_idx ON workflows(created_by);
CREATE INDEX IF NOT EXISTS workflows_company_id_idx ON workflows(company_id);
CREATE INDEX IF NOT EXISTS workflows_is_public_idx ON workflows(is_public);
CREATE INDEX IF NOT EXISTS workflow_history_workflow_id_idx ON workflow_history(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_collaborators_workflow_id_idx ON workflow_collaborators(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_collaborators_user_id_idx ON workflow_collaborators(user_id);
