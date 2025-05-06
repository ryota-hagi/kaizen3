import { supabase } from './supabaseClient';

// companiesテーブルを作成する関数
export const createCompaniesTable = async () => {
  try {
    const client = supabase();
    
    // companiesテーブルが存在するか確認
    const { data: existingTable, error: checkError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'companies')
      .single();
    
    if (!checkError && existingTable) {
      console.log('[Supabase] companies table already exists');
      return { success: true, message: 'Table already exists' };
    }
    
    // uuid-ossp拡張機能が有効になっているか確認し、なければ有効化
    await client.rpc('execute_sql', {
      sql_query: `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      `
    });
    
    // companiesテーブルを作成
    const { error } = await client.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.companies (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (error) {
      console.error('[Supabase] Error creating companies table:', error);
      return { success: false, error };
    }
    
    console.log('[Supabase] companies table created successfully');
    return { success: true, message: 'Table created successfully' };
  } catch (error) {
    console.error('[Supabase] Exception creating companies table:', error);
    return { success: false, error };
  }
};
