-- 招待トークンの一意制約を追加
ALTER TABLE invitations
  ADD CONSTRAINT invitations_invite_token_key UNIQUE(invite_token);

-- 検索を高速化するためのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_invite_token ON invitations(invite_token);

-- 同じメールアドレスの古い招待を削除するための関数
CREATE OR REPLACE FUNCTION clean_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- 同じメールアドレスの古い招待を削除（トークンが異なるもの）
  DELETE FROM invitations
  WHERE email = NEW.email
    AND invite_token <> NEW.invite_token
    AND status = 'pending';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（既に存在する場合は削除してから作成）
DROP TRIGGER IF EXISTS clean_old_invitations_trigger ON invitations;

CREATE TRIGGER clean_old_invitations_trigger
AFTER INSERT ON invitations
FOR EACH ROW
EXECUTE FUNCTION clean_old_invitations();

-- コメント
COMMENT ON CONSTRAINT invitations_invite_token_key ON invitations IS '招待トークンは一意である必要があります';
COMMENT ON INDEX idx_invite_token IS '招待トークンによる検索を高速化するためのインデックス';
COMMENT ON FUNCTION clean_old_invitations() IS '同じメールアドレスの古い招待を自動的に削除する関数';
COMMENT ON TRIGGER clean_old_invitations_trigger ON invitations IS '新しい招待が作成されたときに古い招待を削除するトリガー';
