import { supabase } from './supabaseClient';

// companiesテーブルを確認する関数
export const createCompaniesTable = async () => {
  try {
    const client = supabase();
    
    // companiesテーブルにクエリを実行してテーブルの存在を確認
    const { data, error } = await client
      .from('companies')
      .select('id')
      .limit(1);
    
    if (error && error.code !== '42P01') { // 42P01はテーブルが存在しないエラーコード
      console.error('[Supabase] Error checking companies table:', error);
      return { success: false, error, exists: false };
    }
    
    if (error && error.code === '42P01') {
      console.log('[Supabase] companies table does not exist');
      return { success: true, exists: false };
    }
    
    console.log('[Supabase] companies table exists');
    return { success: true, exists: true };
  } catch (error) {
    console.error('[Supabase] Exception checking companies table:', error);
    return { success: false, error, exists: false };
  }
};
