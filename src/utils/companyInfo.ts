import { getSupabaseClient } from '@/lib/supabaseClient'

/**
 * 会社情報の型
 */
export interface CompanyInfo {
  id: string
  name: string
  industry?: string
  size?: string
  address?: string
  [key: string]: any
}

/**
 * キャメルケースをスネークケースに変換する関数
 * 例: foundedYear -> founded_year
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * オブジェクトのキーをキャメルケースからスネークケースに変換する関数
 */
function convertKeysToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    // userCountsなどの内部オブジェクトは除外（Supabaseに送信しない）
    if (key === 'userCounts') return;
    
    // キーをスネークケースに変換
    const snakeKey = camelToSnakeCase(key);
    result[snakeKey] = obj[key];
  });
  
  return result;
}

/**
 * 会社情報をSupabaseのcompaniesテーブルに更新する関数
 * 
 * @param companyInfo 更新する会社情報
 * @returns 成功したかどうかと、エラーまたはデータ
 */
export async function updateCompanyInfo(companyInfo: CompanyInfo): Promise<{ success: boolean, data?: any, error?: any }> {
  if (!companyInfo || !companyInfo.id) {
    console.error('[companyInfo] companyId is missing, skip update')
    return { success: false, error: 'Company ID is required' }
  }

  try {
    // キャメルケースのプロパティ名をスネークケースに変換
    const snakeCaseCompanyInfo = convertKeysToSnakeCase(companyInfo);
    
    // foundedYearをfounded_yearに明示的に変換
    if (companyInfo.foundedYear) {
      snakeCaseCompanyInfo.founded_year = companyInfo.foundedYear;
      delete snakeCaseCompanyInfo.foundedYear; // 重複を避けるために削除
    }
    
    // businessDescriptionをbusiness_descriptionに明示的に変換
    if (companyInfo.businessDescription) {
      snakeCaseCompanyInfo.business_description = companyInfo.businessDescription;
      delete snakeCaseCompanyInfo.businessDescription; // 重複を避けるために削除
    }
    
    // contactEmailをcontact_emailに明示的に変換
    if (companyInfo.contactEmail) {
      snakeCaseCompanyInfo.contact_email = companyInfo.contactEmail;
      delete snakeCaseCompanyInfo.contactEmail; // 重複を避けるために削除
    }
    
    console.log('[companyInfo] Converted to snake case:', snakeCaseCompanyInfo);
    
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('companies')
      .upsert(snakeCaseCompanyInfo, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[companyInfo] Failed to update company info:', error)
      return { success: false, error }
    }

    console.log('[companyInfo] Company info updated successfully:', data)
    
    // ローカルストレージも更新
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kaizen_company_info', JSON.stringify(companyInfo))
      } catch (e) {
        console.error('[companyInfo] Failed to cache updated company info:', e)
      }
    }

    return { success: true, data }
  } catch (e) {
    console.error('[companyInfo] Unexpected error updating company info:', e)
    return { success: false, error: e }
  }
}

/**
 * companyId から Supabase の companies テーブルを検索し、
 * 取得したデータを localStorage(`kaizen_company_info`) にキャッシュして返す。
 *
 * 会社情報が取得できなかった場合は null を返す。
 */
export async function fetchAndCacheCompanyInfo(
  companyId: string | undefined | null
): Promise<CompanyInfo | null> {
  if (!companyId) {
    console.warn('[companyInfo] companyId is null, skip fetch')
    return null
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error || !data) {
      console.error('[companyInfo] Failed to fetch company info:', error)
      return null
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kaizen_company_info', JSON.stringify(data))
      } catch (e) {
        console.error('[companyInfo] Failed to cache company info:', e)
      }
    }

    return data as CompanyInfo
  } catch (e) {
    console.error('[companyInfo] Unexpected error:', e)
    return null
  }
}

/**
 * localStorage から会社情報を取得するヘルパー
 */
export function getCachedCompanyInfo(): CompanyInfo | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('kaizen_company_info')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
