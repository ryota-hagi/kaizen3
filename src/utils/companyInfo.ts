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
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('companies')
      .upsert(companyInfo, { onConflict: 'id' })
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
