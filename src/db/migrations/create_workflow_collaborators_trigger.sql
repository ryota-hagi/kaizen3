-- workflow_collaboratorsテーブルの変更を監視するトリガー関数
CREATE OR REPLACE FUNCTION public.handle_workflow_collaborator_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- 新しい共同編集者が追加された場合
  IF (TG_OP = 'INSERT') THEN
    -- workflow_historyテーブルに記録
    INSERT INTO public.workflow_history (
      workflow_id,
      changed_by,
      change_type,
      previous_state,
      new_state
    ) VALUES (
      NEW.workflow_id,
      NEW.added_by,
      'collaborator_added',
      NULL,
      jsonb_build_object(
        'collaborator_id', NEW.id,
        'user_id', NEW.user_id,
        'permission_type', NEW.permission_type
      )
    );
    RETURN NEW;
  
  -- 共同編集者が削除された場合
  ELSIF (TG_OP = 'DELETE') THEN
    -- workflow_historyテーブルに記録
    INSERT INTO public.workflow_history (
      workflow_id,
      changed_by,
      change_type,
      previous_state,
      new_state
    ) VALUES (
      OLD.workflow_id,
      current_setting('request.jwt.claims', true)::jsonb->>'sub',
      'collaborator_removed',
      jsonb_build_object(
        'collaborator_id', OLD.id,
        'user_id', OLD.user_id,
        'permission_type', OLD.permission_type
      ),
      NULL
    );
    RETURN OLD;
  
  -- 共同編集者の権限が更新された場合
  ELSIF (TG_OP = 'UPDATE') THEN
    -- 権限が変更された場合のみ記録
    IF (OLD.permission_type <> NEW.permission_type) THEN
      INSERT INTO public.workflow_history (
        workflow_id,
        changed_by,
        change_type,
        previous_state,
        new_state
      ) VALUES (
        NEW.workflow_id,
        NEW.added_by,
        'collaborator_updated',
        jsonb_build_object(
          'collaborator_id', OLD.id,
          'user_id', OLD.user_id,
          'permission_type', OLD.permission_type
        ),
        jsonb_build_object(
          'collaborator_id', NEW.id,
          'user_id', NEW.user_id,
          'permission_type', NEW.permission_type
        )
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS workflow_collaborators_trigger ON public.workflow_collaborators;

-- トリガーを作成
CREATE TRIGGER workflow_collaborators_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.workflow_collaborators
FOR EACH ROW EXECUTE FUNCTION public.handle_workflow_collaborator_changes();
