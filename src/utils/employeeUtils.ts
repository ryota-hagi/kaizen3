import { getSupabaseClient } from '@/lib/supabaseClient'

/**
 * 従業員情報の型
 */
export interface Employee {
  id: string
  company_id?: string
  name: string
  position: string
  department: string
  hourly_rate: number
  created_at?: string
  updated_at?: string
}

/**
 * フロントエンド用の従業員情報の型（キャメルケース）
 */
export interface EmployeeUI {
  id: string
  companyId?: string
  name: string
  position: string
  department: string
  hourlyRate: number
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
 * DBの従業員情報をUI用に変換する関数
 */
export function convertEmployeeToUI(employee: any): EmployeeUI {
  const uiEmployee = snakeToCamelCase(employee) as EmployeeUI;
  return uiEmployee;
}

/**
 * UI用の従業員情報をDB用に変換する関数
 */
export function convertUIToEmployee(employee: Record<string, any>): Record<string, any> {
  const dbEmployee = camelToSnakeCase(employee);
  return dbEmployee;
}

/**
 * 会社IDに紐づく従業員情報をSupabaseから取得する関数
 */
export async function fetchEmployees(companyId: string): Promise<EmployeeUI[]> {
  if (!companyId) {
    console.error('[employeeUtils] companyId is missing, skip fetch');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[employeeUtils] Failed to fetch employees:', error);
      return [];
    }

    // DBの従業員情報をUI用に変換
    const employees = data ? data.map((emp: any) => convertEmployeeToUI(emp)) : [];
    
    // ローカルストレージにキャッシュ
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kaizen_employees', JSON.stringify(employees));
      } catch (e) {
        console.error('[employeeUtils] Failed to cache employees:', e);
      }
    }

    return employees;
  } catch (e) {
    console.error('[employeeUtils] Unexpected error:', e);
    return [];
  }
}

/**
 * 従業員情報をSupabaseに追加する関数
 */
export async function addEmployee(employee: Omit<EmployeeUI, 'id'>, companyId: string): Promise<{ success: boolean; data?: EmployeeUI; error?: any }> {
  if (!companyId) {
    console.error('[employeeUtils] companyId is missing, skip add');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    // UI用の従業員情報をDB用に変換
    const employeeObj = {
      ...employee,
      companyId
    };
    const dbEmployee = camelToSnakeCase(employeeObj);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('employees')
      .insert(dbEmployee)
      .select()
      .single();

    if (error) {
      console.error('[employeeUtils] Failed to add employee:', error);
      return { success: false, error };
    }

    // DBの従業員情報をUI用に変換
    const uiEmployee = data ? convertEmployeeToUI(data) : undefined;

    return { success: true, data: uiEmployee };
  } catch (e) {
    console.error('[employeeUtils] Unexpected error adding employee:', e);
    return { success: false, error: e };
  }
}

/**
 * 従業員情報をSupabaseで更新する関数
 */
export async function updateEmployee(employee: EmployeeUI, companyId: string): Promise<{ success: boolean; data?: EmployeeUI; error?: any }> {
  if (!employee.id) {
    console.error('[employeeUtils] employee.id is missing, skip update');
    return { success: false, error: 'Employee ID is required' };
  }

  if (!companyId) {
    console.error('[employeeUtils] companyId is missing, skip update');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    // UI用の従業員情報をDB用に変換（idを除外）
    const { id, ...employeeWithoutId } = employee;
    const employeeObj = {
      ...employeeWithoutId,
      companyId
    };
    
    const dbEmployee = camelToSnakeCase(employeeObj);

    // 直接IDを使用して更新（UUIDエラーが発生する可能性があるため、try-catchで囲む）
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('employees')
        .update(dbEmployee)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('[employeeUtils] Failed to update employee with ID:', error);
        throw error;
      }

      // DBの従業員情報をUI用に変換
      const uiEmployee = data ? convertEmployeeToUI(data) : undefined;

      return { success: true, data: uiEmployee };
    } catch (idError) {
      // IDによる更新が失敗した場合、名前で検索して更新を試みる
      console.warn('[employeeUtils] Failed to update by ID, trying by name:', idError);
      
      const supabase = getSupabaseClient();
      
      // 名前で検索
      const { data: existingEmployees, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('name', employee.name);
      
      if (fetchError || !existingEmployees || existingEmployees.length === 0) {
        console.error('[employeeUtils] Employee not found by name:', employee.name);
        return { success: false, error: 'Employee not found' };
      }
      
      // 最初の一致する従業員を使用（型アサーションを追加）
      const existingEmployee = existingEmployees[0] as unknown as Employee;
      
      // 既存のレコードのUUIDを使用して更新
      const { data, error } = await supabase
        .from('employees')
        .update(dbEmployee)
        .eq('id', existingEmployee.id as string)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('[employeeUtils] Failed to update employee by name:', error);
        return { success: false, error };
      }

      // DBの従業員情報をUI用に変換
      const uiEmployee = data ? convertEmployeeToUI(data) : undefined;

      return { success: true, data: uiEmployee };
    }
  } catch (e) {
    console.error('[employeeUtils] Unexpected error updating employee:', e);
    return { success: false, error: e };
  }
}

/**
 * 従業員情報をSupabaseから削除する関数
 */
export async function deleteEmployee(id: string, companyId: string): Promise<{ success: boolean; error?: any }> {
  if (!id) {
    console.error('[employeeUtils] id is missing, skip delete');
    return { success: false, error: 'Employee ID is required' };
  }

  if (!companyId) {
    console.error('[employeeUtils] companyId is missing, skip delete');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('[employeeUtils] Failed to delete employee:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    console.error('[employeeUtils] Unexpected error deleting employee:', e);
    return { success: false, error: e };
  }
}

/**
 * ローカルストレージから従業員情報を取得するヘルパー
 */
export function getCachedEmployees(): EmployeeUI[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('kaizen_employees');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * ローカルストレージの従業員情報をSupabaseに同期する関数
 */
export async function syncEmployeesToSupabase(companyId: string): Promise<{ success: boolean; error?: any }> {
  if (!companyId) {
    console.error('[employeeUtils] companyId is missing, skip sync');
    return { success: false, error: 'Company ID is required' };
  }

  try {
    const cachedEmployees = getCachedEmployees();
    if (cachedEmployees.length === 0) {
      console.log('[employeeUtils] No cached employees to sync');
      return { success: true };
    }

    const supabase = getSupabaseClient();
    
    // 既存の従業員情報を取得
    const { data: existingEmployees, error: fetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId);

    if (fetchError) {
      console.error('[employeeUtils] Failed to fetch existing employees:', fetchError);
      return { success: false, error: fetchError };
    }

    const existingIds = new Set(existingEmployees.map(e => e.id));
    
    // 新規追加する従業員情報
    const employeesToAdd = cachedEmployees
      .filter(e => !existingIds.has(e.id))
      .map(e => {
        const employeeData = camelToSnakeCase(e);
        return {
          ...employeeData,
          company_id: companyId
        };
      });

    if (employeesToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('employees')
        .insert(employeesToAdd);

      if (insertError) {
        console.error('[employeeUtils] Failed to insert employees:', insertError);
        return { success: false, error: insertError };
      }
    }

    console.log(`[employeeUtils] Successfully synced ${employeesToAdd.length} employees to Supabase`);
    return { success: true };
  } catch (e) {
    console.error('[employeeUtils] Unexpected error syncing employees:', e);
    return { success: false, error: e };
  }
}
