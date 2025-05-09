-- exec_sql関数を作成
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- SQLクエリを実行し、結果をJSONBとして返す
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL実行エラー: %', SQLERRM;
END;
$$;

-- get_workflow_collaborators関数を作成
CREATE OR REPLACE FUNCTION get_workflow_collaborators(workflow_id_param UUID)
RETURNS SETOF workflow_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM workflow_collaborators
  WHERE workflow_id = workflow_id_param;
END;
$$;

-- add_workflow_collaborator関数を作成
CREATE OR REPLACE FUNCTION add_workflow_collaborator(
  workflow_id_param UUID,
  user_id_param UUID,
  permission_type_param TEXT,
  added_by_param UUID
)
RETURNS SETOF workflow_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_full_name TEXT;
  collaborator_id UUID;
BEGIN
  -- ユーザーのfull_nameを取得
  SELECT full_name INTO user_full_name
  FROM app_users
  WHERE id = user_id_param;

  -- ユーザーが存在しない場合は作成
  IF user_full_name IS NULL THEN
    INSERT INTO app_users (id, auth_uid, email, full_name, role, status)
    VALUES (user_id_param, user_id_param, '', user_id_param::TEXT, '一般ユーザー', 'アクティブ')
    ON CONFLICT (id) DO NOTHING
    RETURNING full_name INTO user_full_name;
  END IF;

  -- 共同編集者を追加または更新
  INSERT INTO workflow_collaborators (workflow_id, user_id, permission_type, full_name, added_by)
  VALUES (workflow_id_param, user_id_param, permission_type_param, COALESCE(user_full_name, user_id_param::TEXT), added_by_param)
  ON CONFLICT (workflow_id, user_id)
  DO UPDATE SET
    permission_type = permission_type_param,
    full_name = COALESCE(user_full_name, user_id_param::TEXT),
    added_by = added_by_param
  RETURNING id INTO collaborator_id;

  -- 追加または更新された共同編集者を返す
  RETURN QUERY
  SELECT *
  FROM workflow_collaborators
  WHERE id = collaborator_id;
END;
$$;

-- remove_workflow_collaborator関数を作成
CREATE OR REPLACE FUNCTION remove_workflow_collaborator(collaborator_id_param UUID)
RETURNS SETOF workflow_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM workflow_collaborators
  WHERE id = collaborator_id_param
  RETURNING *;
END;
$$;
