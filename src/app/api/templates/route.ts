import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// テンプレート情報のAPIルート
export async function GET(req: NextRequest) {
  try {
    // 認証用Supabaseクライアントを取得
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // 認証チェック
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // URLからcompanyIdを取得
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // データ操作用Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // テンプレート情報を取得
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('company_id', companyId)
      .order('title', { ascending: true });

    if (error) {
      console.error('[API] Failed to fetch templates:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] Unexpected error in templates GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// テンプレート情報を追加するAPIルート
export async function POST(req: NextRequest) {
  try {
    // 認証用Supabaseクライアントを取得
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // 認証チェック
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await req.json();

    // 必須フィールドのチェック
    if (!body.company_id || !body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Company ID, title and content are required' },
        { status: 400 }
      );
    }

    // データ操作用Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // テンプレート情報を追加
    const { data, error } = await supabase
      .from('templates')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('[API] Failed to add template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] Unexpected error in templates POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// テンプレート情報を更新するAPIルート
export async function PUT(req: NextRequest) {
  try {
    // 認証用Supabaseクライアントを取得
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // 認証チェック
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await req.json();

    // 必須フィールドのチェック
    if (!body.id || !body.company_id) {
      return NextResponse.json(
        { success: false, error: 'Template ID and Company ID are required' },
        { status: 400 }
      );
    }

    // データ操作用Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // テンプレート情報を更新
    const { data, error } = await supabase
      .from('templates')
      .update(body)
      .eq('id', body.id)
      .eq('company_id', body.company_id)
      .select()
      .single();

    if (error) {
      console.error('[API] Failed to update template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] Unexpected error in templates PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// テンプレート情報を削除するAPIルート
export async function DELETE(req: NextRequest) {
  try {
    // 認証用Supabaseクライアントを取得
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // 認証チェック
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // URLからidとcompanyIdを取得
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');

    if (!id || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Template ID and Company ID are required' },
        { status: 400 }
      );
    }

    // データ操作用Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // テンプレート情報を削除
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('[API] Failed to delete template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Unexpected error in templates DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
