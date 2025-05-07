import axios from 'axios';

// ユーザーステータスの型定義
export type UserStatus = '招待中' | 'verified' | 'completed' | 'ログアウト中' | 'アクティブ';

// ユーザー情報の型定義
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string; // 所属会社ID
  department?: string;
  position?: string;
  profileImage?: string;
  createdAt: string;
  lastLogin?: string | null;
  isInvited?: boolean; // 招待ステータス（後方互換性のため残す）
  status?: UserStatus; // ユーザーステータス（'招待中' | 'verified' | 'completed' | 'ログアウト中' | 'アクティブ'）
  employeeId?: string; // 紐づけられた従業員ID
  inviteToken: string; // 招待トークン（Google認証用）- 必須プロパティに変更
}

// 会社情報の型定義
export interface CompanyInfo {
  id?: string; // ユニークな会社ID（新規追加）
  name: string;
  industry?: string; // オプショナルに変更
  size?: string; // オプショナルに変更
  address?: string; // オプショナルに変更
  businessDescription?: string; // 事業内容
  foundedYear?: string; // 設立年
  website?: string; // Webサイト
  contactEmail?: string; // 連絡先メール
  userCounts?: {
    admin: number; // 管理者数
    manager: number; // マネージャー数
    user: number; // 一般ユーザー数
  };
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
  createdBy?: string; // 作成者のユーザーID
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
      console.log('- id:', companyInfo.id);
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

/**
 * ユニークな会社IDを生成する関数
 * @returns ユニークな会社ID（KZ-で始まる10桁の英数字）
 */
export function generateCompanyId(): string {
  const prefix = 'KZ-';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  
  // 7桁のランダムな英数字を生成
  for (let i = 0; i < 7; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * ユーザーロールごとの人数をカウントする関数
 * @param users ユーザー情報の配列
 * @param companyId 会社ID
 * @returns ロールごとのユーザー数
 */
export function countUsersByRole(users: UserInfo[], companyId: string): { admin: number; manager: number; user: number } {
  // 指定された会社に所属するユーザーのみをフィルタリング
  const companyUsers = users.filter(user => user.companyId === companyId);
  
  // ロールごとにカウント
  const counts = {
    admin: 0,
    manager: 0,
    user: 0
  };
  
  companyUsers.forEach(user => {
    if (user.role === '管理者') {
      counts.admin++;
    } else if (user.role === 'マネージャー') {
      counts.manager++;
    } else {
      counts.user++;
    }
  });
  
  return counts;
}
