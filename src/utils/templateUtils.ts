import { getSupabaseClient } from '@/lib/supabaseClient'

/**
 * テンプレート情報の型
 */
export interface Template {
  id: string
  company_id?: string
  title: string
  content: string
  created_at?: string
  updated_at?: string
}

/**
 * フロントエンド用のテンプレート情報の型（キャメルケース）
 */
export interface TemplateUI {
  id: string
  companyId?: string
  title: string
  content: string
  createdAt?: string
  updatedAt?: string
}

/**
 * スネークケースからキャメルケースに変換する関数
 */
function snakeToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    // スネークケースをキャメルケースに変換
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  });
  
  return result;
}

/**
 * キャメルケースからスネークケースに変換する関数
 */
function camelToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    // キャメルケースをスネークケースに変換
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  });
  
  return result;
}

/**
 * DBのテンプレート情報をUI用に変換する関数
 */
export function convertTemplateToUI(template: any): TemplateUI {
  const uiTemplate = snakeToCamelCase(template) as TemplateUI;
  return uiTemplate;
}

/**
 * UI用のテンプレート情報をDB用に変換する関数
 */
export function convertUIToTemplate(template: Record<string, any>): Record<string, any> {
  const dbTemplate = camelToSnakeCase(template);
  return dbTemplate;
}

/**
 * 会社IDに紐づくテンプレート情報をSupabaseから取得する関数
 */
export async function fetchTemplates(companyId: string): Promise<TemplateUI[]> {
  if (!companyId) {
    console.error('[templateUtils] companyId is missing, skip fetch');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('company_id', companyId)
      .order('title', { ascending: true });

    if (error) {
      console.error('[templateUtils] Failed to fetch templates:', error);
      return [];
    }

    // DBのテンプレート情報をUI用に変換
    const templates = data ? data.map((temp: any) => convertTemplateToUI(temp)) : [];
    
    // ローカルストレージにキャッシュ
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kaizen_templates', JSON.stringify(templates));
      } catch (e) {
        console.error('[templateUtils] Failed to cache templates:', e);
      }
    }

    return templates;
  } catch (e) {
    console.error('[templateUtils] Unexpected error:', e);
    return [];
  }
}

/**
 * テンプレート情報をSupabaseに追加する関数
 */
export async function addTemplate(template: Omit<TemplateUI, 'id'>, companyId: string): Promise<{ success: boolean; data?: TemplateUI; error?: any }> {
  if (!companyId) {
    console.error('[templateUtils] companyId is missing, skip add');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    // UI用のテンプレート情報をDB用に変換
    const templateObj = {
      ...template,
      companyId
    };
    const dbTemplate = camelToSnakeCase(templateObj);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('templates')
      .insert(dbTemplate)
      .select()
      .single();

    if (error) {
      console.error('[templateUtils] Failed to add template:', error);
      return { success: false, error };
    }

    // DBのテンプレート情報をUI用に変換
    const uiTemplate = data ? convertTemplateToUI(data) : undefined;

    return { success: true, data: uiTemplate };
  } catch (e) {
    console.error('[templateUtils] Unexpected error adding template:', e);
    return { success: false, error: e };
  }
}

/**
 * テンプレート情報をSupabaseで更新する関数
 */
export async function updateTemplate(template: TemplateUI, companyId: string): Promise<{ success: boolean; data?: TemplateUI; error?: any }> {
  if (!template.id) {
    console.error('[templateUtils] template.id is missing, skip update');
    return { success: false, error: 'Template ID is required' };
  }

  if (!companyId) {
    console.error('[templateUtils] companyId is missing, skip update');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    // UI用のテンプレート情報をDB用に変換（idを除外）
    const { id, ...templateWithoutId } = template;
    const templateObj = {
      ...templateWithoutId,
      companyId
    };
    
    const dbTemplate = camelToSnakeCase(templateObj);
    console.log('[templateUtils] Template data to update:', {
      id,
      ...dbTemplate
    });

    // 直接IDを使用して更新（UUIDエラーが発生する可能性があるため、try-catchで囲む）
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('templates')
        .update(dbTemplate)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('[templateUtils] Failed to update template with ID:', error);
        throw error;
      }

      // DBのテンプレート情報をUI用に変換
      const uiTemplate = data ? convertTemplateToUI(data) : undefined;

      return { success: true, data: uiTemplate };
    } catch (idError) {
      // IDによる更新が失敗した場合、タイトルで検索して更新を試みる
      console.warn('[templateUtils] Failed to update by ID, trying by title:', idError);
      
      const supabase = getSupabaseClient();
      
      // タイトルで検索
      const { data: existingTemplates, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('title', template.title);
      
      if (fetchError || !existingTemplates || existingTemplates.length === 0) {
        console.error('[templateUtils] Template not found by title:', template.title);
        return { success: false, error: 'Template not found' };
      }
      
      // 最初の一致するテンプレートを使用（型アサーションを追加）
      const existingTemplate = existingTemplates[0] as unknown as Template;
      
      // 既存のレコードのUUIDを使用して更新
      const { data, error } = await supabase
        .from('templates')
        .update(dbTemplate)
        .eq('id', existingTemplate.id as string)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('[templateUtils] Failed to update template by title:', error);
        return { success: false, error };
      }

      // DBのテンプレート情報をUI用に変換
      const uiTemplate = data ? convertTemplateToUI(data) : undefined;

      return { success: true, data: uiTemplate };
    }
  } catch (e) {
    console.error('[templateUtils] Unexpected error updating template:', e);
    return { success: false, error: e };
  }
}

/**
 * テンプレート情報をSupabaseから削除する関数
 */
export async function deleteTemplate(id: string, companyId: string): Promise<{ success: boolean; error?: any }> {
  if (!id) {
    console.error('[templateUtils] id is missing, skip delete');
    return { success: false, error: 'Template ID is required' };
  }

  if (!companyId) {
    console.error('[templateUtils] companyId is missing, skip delete');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('[templateUtils] Failed to delete template:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    console.error('[templateUtils] Unexpected error deleting template:', e);
    return { success: false, error: e };
  }
}

/**
 * ローカルストレージからテンプレート情報を取得するヘルパー
 */
export function getCachedTemplates(): TemplateUI[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('kaizen_templates');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * ローカルストレージのテンプレート情報をSupabaseに同期する関数
 */
export async function syncTemplatesToSupabase(companyId: string): Promise<{ success: boolean; error?: any }> {
  if (!companyId) {
    console.error('[templateUtils] companyId is missing, skip sync');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    const cachedTemplates = getCachedTemplates();
    if (cachedTemplates.length === 0) {
      console.log('[templateUtils] No cached templates to sync');
      return { success: true };
    }

    const supabase = getSupabaseClient();
    
    // 既存のテンプレート情報を取得
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('templates')
      .select('id')
      .eq('company_id', companyId);

    if (fetchError) {
      console.error('[templateUtils] Failed to fetch existing templates:', fetchError);
      return { success: false, error: fetchError };
    }

    const existingIds = new Set(existingTemplates.map(t => t.id));
    
    // 新規追加するテンプレート情報
    const templatesToAdd = cachedTemplates
      .filter(t => !existingIds.has(t.id))
      .map(t => {
        const templateData = camelToSnakeCase(t);
        return {
          ...templateData,
          company_id: companyId
        };
      });

    if (templatesToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('templates')
        .insert(templatesToAdd);

      if (insertError) {
        console.error('[templateUtils] Failed to insert templates:', insertError);
        return { success: false, error: insertError };
      }
    }

    console.log(`[templateUtils] Successfully synced ${templatesToAdd.length} templates to Supabase`);
    return { success: true };
  } catch (e) {
    console.error('[templateUtils] Unexpected error syncing templates:', e);
    return { success: false, error: e };
  }
}
