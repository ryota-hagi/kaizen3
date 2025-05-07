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
    // 特別なケース：companyIdはcompany_idに直接変換
    if (key === 'companyId') {
      result['company_id'] = obj[key];
    } else {
      // 通常のキャメルケースをスネークケースに変換
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
    }
  });
  
  // company_idが存在することを確認
  if (!result['company_id'] && obj['companyId']) {
    result['company_id'] = obj['companyId'];
  }
  
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
    // 会社IDを大文字に変換
    const normalizedCompanyId = companyId.toUpperCase();
    console.log('[templateUtils] Original Company ID:', companyId);
    console.log('[templateUtils] Normalized Company ID:', normalizedCompanyId);
    
    // UI用のテンプレート情報をDB用に変換
    const dbTemplate = {
      title: template.title,
      content: template.content,
      company_id: normalizedCompanyId
    };
    
    console.log('[templateUtils] Template data to insert:', dbTemplate);

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
    // 会社IDを大文字に変換
    const normalizedCompanyId = companyId.toUpperCase();
    console.log('[templateUtils] Original Company ID:', companyId);
    console.log('[templateUtils] Normalized Company ID:', normalizedCompanyId);
    
    // UI用のテンプレート情報をDB用に変換
    const dbTemplate = {
      id: template.id,
      title: template.title,
      content: template.content,
      company_id: normalizedCompanyId
    };
    
    console.log('[templateUtils] Template data to update:', dbTemplate);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('templates')
      .update(dbTemplate)
      .eq('id', template.id)
      .eq('company_id', normalizedCompanyId)
      .select()
      .single();

    if (error) {
      console.error('[templateUtils] Failed to update template:', error);
      return { success: false, error };
    }

    // DBのテンプレート情報をUI用に変換
    const uiTemplate = data ? convertTemplateToUI(data) : undefined;

    return { success: true, data: uiTemplate };
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
    // 会社IDを大文字に変換
    const normalizedCompanyId = companyId.toUpperCase();
    console.log('[templateUtils] Original Company ID:', companyId);
    console.log('[templateUtils] Normalized Company ID:', normalizedCompanyId);

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('company_id', normalizedCompanyId);

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
    // 会社IDを大文字に変換
    const normalizedCompanyId = companyId.toUpperCase();
    console.log('[templateUtils] Original Company ID:', companyId);
    console.log('[templateUtils] Normalized Company ID:', normalizedCompanyId);
    
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
      .eq('company_id', normalizedCompanyId);

    if (fetchError) {
      console.error('[templateUtils] Failed to fetch existing templates:', fetchError);
      return { success: false, error: fetchError };
    }

    const existingIds = new Set(existingTemplates.map(t => t.id));
    
    // 新規追加するテンプレート情報
    const templatesToAdd = cachedTemplates
      .filter(t => !existingIds.has(t.id))
      .map(t => {
        return {
          id: t.id,
          title: t.title,
          content: t.content,
          company_id: normalizedCompanyId
        };
      });

    if (templatesToAdd.length > 0) {
      console.log('[templateUtils] Templates to add:', templatesToAdd);
      
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
