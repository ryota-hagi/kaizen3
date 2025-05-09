-- 外部キー制約を削除
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_created_by_fkey;

-- created_byカラムをNULL許容に変更
ALTER TABLE workflows ALTER COLUMN created_by DROP NOT NULL;
