import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

// workflow_collaboratorsテーブルのRLSを有効化するSQL
const enableWorkflowCollaboratorsRlsSql = `
-- workflow_collaboratorsテーブルのRLSを有効化
ALTER TABLE public.workflow_collaborators ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを確認し、存在する場合は削除
DROP POLICY IF EXISTS allow_all_workflow_collaborators ON public.workflow_collaborators;

-- 適切なRLSポリシーを作成
-- 管理者用ポリシー
CREATE POLICY admin_all_workflow_collaborators ON public.workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.auth_uid = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- ワークフロー作成者用ポリシー
CREATE POLICY creator_workflow_collaborators ON public.workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows
      WHERE workflows.id = workflow_collaborators.workflow_id
      AND workflows.created_by = auth.uid()
    )
  );

-- 共同編集者自身がアクセスできるポリシー
CREATE POLICY collaborator_self_access ON public.workflow_collaborators
  FOR SELECT
  TO authenticated
  USING (
    workflow_collaborators.user_id = auth.uid()
  );

-- 同じ部署のマネージャーがアクセスできるポリシー
CREATE POLICY manager_department_workflow_collaborators ON public.workflow_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.app_users creator ON creator.auth_uid = w.created_by
      JOIN public.app_users u ON u.auth_uid = auth.uid()
      WHERE w.id = workflow_collaborators.workflow_id
      AND u.role = 'manager'
      AND u.company_id = w.company_id
      AND u.department = creator.department
    )
  );
`;

// invitations_vビューのSECURITY DEFINERプロパティを修正するSQL
const fixInvitationsVSecuritySql = `
-- invitations_vビューのSECURITY DEFINERプロパティを修正

-- 既存のビューを削除
DROP VIEW IF EXISTS public.invitations_v;

-- SECURITY INVOKERを使用して安全なビューを再作成
CREATE VIEW public.invitations_v
WITH (security_invoker = true)
AS
SELECT 
  i.id,
  i.email,
  i.company_id,
  i.role,
  i.department,
  i.status,
  i.created_at,
  i.updated_at,
  i.token,
  i.expires_at,
  i.accepted_at,
  i.full_name,
  c.name as company_name
FROM 
  public.invitations i
LEFT JOIN 
  public.companies c ON i.company_id = c.id;

-- ビューに対するRLSポリシーを設定
GRANT SELECT ON public.invitations_v TO authenticated;
GRANT SELECT ON public.invitations_v TO anon;

COMMENT ON VIEW public.invitations_v IS 'セキュリティを強化した招待情報ビュー。SECURITY INVOKERを使用して、ビューを呼び出すユーザーの権限で実行します。';
`;

export async function POST() {
  try {
    // 管理者クライアントを使用してRLSをバイパス
    const adminClient = supabaseAdmin();
    console.log('管理者クライアントを使用してRLSをバイパスします');
    
    // 通常のクライアントでユーザー情報を取得
    const normalClient = supabase();
    const { data: { user }, error: authError } = await normalClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }
    
    // ユーザーが管理者かどうかを確認
    const { data: userData, error: userError } = await normalClient
      .from('app_users')
      .select('role')
      .eq('auth_uid', user.id)
      .single();
      
    if (userError || !userData || userData.role !== '管理者') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // 1. workflow_collaboratorsテーブルのRLSを有効化
    const { error: enableRlsError } = await adminClient.rpc('exec_sql', {
      sql_query: enableWorkflowCollaboratorsRlsSql
    });

    if (enableRlsError) {
      console.error('workflow_collaboratorsテーブルのRLS有効化エラー:', enableRlsError);
      return NextResponse.json(
        { error: `workflow_collaboratorsテーブルのRLS有効化に失敗しました: ${enableRlsError.message}` },
        { status: 500 }
      );
    }

    // 2. invitations_vビューのSECURITY DEFINERプロパティを修正
    const { error: fixViewError } = await adminClient.rpc('exec_sql', {
      sql_query: fixInvitationsVSecuritySql
    });

    if (fixViewError) {
      console.error('invitations_vビューの修正エラー:', fixViewError);
      return NextResponse.json(
        { error: `invitations_vビューの修正に失敗しました: ${fixViewError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'セキュリティ問題が修正されました'
    });
  } catch (error) {
    console.error('セキュリティ修正エラー:', error);
    return NextResponse.json(
      { error: `予期しないエラーが発生しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
