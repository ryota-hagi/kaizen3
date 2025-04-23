import axios from 'axios';

// 会社情報の型定義
export interface CompanyInfo {
  name: string;
  industry: string;
  size: string;
  address: string;
  businessDescription?: string; // 事業内容
  foundedYear?: string; // 設立年
  website?: string; // Webサイト
  contactEmail?: string; // 連絡先メール
}

// 従業員情報の型定義
export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  hourlyRate: number;
}

// ワークフロー情報の型定義
export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  assignee: string;
  timeRequired: number;
  position: number;
  cost?: number; // コスト項目を追加
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  isImproved?: boolean;
  originalId?: string;
  isCompleted?: boolean;
  completedAt?: Date;
}

export interface WorkflowContext {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isImproved?: boolean;
  originalId?: string;
  relatedWorkflow?: Workflow; // 関連するワークフロー（改善前または改善後）
}

/**
 * Claude APIを呼び出す関数
 * @param message ユーザーからのメッセージ
 * @param companyInfo 会社情報（オプション）
 * @param employees 従業員情報（オプション）
 * @param workflowContext 現在のワークフロー情報（オプション）
 * @returns Claude APIからの応答テキスト
 */
export async function callClaudeAPI(
  message: string, 
  companyInfo?: CompanyInfo, 
  employees?: Employee[],
  workflowContext?: WorkflowContext
): Promise<string> {
  try {
    console.log('=== callClaudeAPI Function ===');
    console.log('Message:', message);
    console.log('Company Info Type:', companyInfo ? typeof companyInfo : 'undefined');
    
    // 会社情報の詳細なログ
    if (companyInfo) {
      console.log('Company Info Details:');
      console.log('- name:', companyInfo.name);
      console.log('- industry:', companyInfo.industry);
      console.log('- businessDescription:', companyInfo.businessDescription);
      console.log('- size:', companyInfo.size);
      console.log('- address:', companyInfo.address);
    } else {
      console.warn('Company info is null or undefined in callClaudeAPI');
    }
    
    console.log('Employees Type:', employees ? typeof employees : 'undefined');
    console.log('Employees Count:', employees ? employees.length : 0);
    console.log('Workflow Context Type:', workflowContext ? typeof workflowContext : 'undefined');
    
    // リクエストデータの作成
    const requestData = { 
      message,
      companyInfo,
      employees,
      workflowContext
    };
    
    // リクエストデータの検証
    if (!companyInfo || typeof companyInfo !== 'object') {
      console.warn('Invalid company info in request data');
    }
    
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      console.warn('Invalid employees in request data');
    }
    
    console.log('Request Data:', JSON.stringify(requestData, null, 2));
    
    // APIリクエストの送信
    console.log('Sending request to /api/claude');
    const response = await axios.post('/api/claude', requestData);
    console.log('Received response from /api/claude');
    
    console.log('API Response:', response.data);
    
    if (response.data && response.data.response) {
      return response.data.response;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}
