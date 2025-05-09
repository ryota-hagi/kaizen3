-- created_byカラムをNULL許容に変更
ALTER TABLE workflows ALTER COLUMN created_by DROP NOT NULL;

-- 既存のNULLのcreated_byを持つレコードを修正するためのインデックスを作成
CREATE INDEX IF NOT EXISTS workflows_null_created_by_idx ON workflows((created_by IS NULL)) WHERE created_by IS NULL;
