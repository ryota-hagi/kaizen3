/**
 * テスト用のデータを作成するユーティリティ関数
 */

import { saveToLocalStorage } from './localStorage';

/**
 * テスト用のユーザーデータを作成してローカルストレージに保存する
 */
export const createTestUser = () => {
  // テスト用ユーザー情報
  const testUser = {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    fullName: '管理者ユーザー',
    role: '管理者',
    companyId: 'test-company',
    department: '開発部',
    position: 'システム管理者',
    isInvited: false,
    status: 'アクティブ',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  // パスワード情報を含むユーザーデータ
  const userWithPassword = [
    {
      user: testUser,
      password: 'password123'
    }
  ];

  // ローカルストレージに保存
  saveToLocalStorage('kaizen_users', userWithPassword);
  
  // 現在のユーザーとしても保存（ログイン状態にする）
  saveToLocalStorage('kaizen_user_info', testUser);
  console.log('テスト用ユーザーデータを作成しました:', testUser.username);

  return testUser;
};

/**
 * テスト用の会社データを作成してローカルストレージに保存する
 */
export const createTestCompany = () => {
  // テスト用会社情報
  const testCompany = {
    name: 'test-company',
    industry: 'IT',
    size: '50-100人',
    address: '東京都渋谷区',
    businessDescription: 'ソフトウェア開発',
    foundedYear: '2020',
    website: 'https://example.com',
    contactEmail: 'info@example.com'
  };

  // ローカルストレージに保存
  saveToLocalStorage('kaizen_company_info', testCompany);
  console.log('テスト用会社データを作成しました:', testCompany.name);

  return testCompany;
};

/**
 * テスト用の従業員データを作成してローカルストレージに保存する
 */
export const createTestEmployees = () => {
  // テスト用従業員情報
  const testEmployees = [
    {
      id: '1',
      name: '山田太郎',
      position: '営業部長',
      department: '営業部',
      hourlyRate: 3000
    },
    {
      id: '2',
      name: '佐藤花子',
      position: '経理担当',
      department: '管理部',
      hourlyRate: 2500
    },
    {
      id: '3',
      name: '鈴木一郎',
      position: '倉庫管理者',
      department: '物流部',
      hourlyRate: 2000
    }
  ];

  // ローカルストレージに保存
  saveToLocalStorage('kaizen_employees', testEmployees);
  console.log('テスト用従業員データを作成しました:', testEmployees.length, '件');

  return testEmployees;
};

/**
 * すべてのテストデータを作成する
 */
export const createAllTestData = () => {
  const user = createTestUser();
  const company = createTestCompany();
  const employees = createTestEmployees();

  return {
    user,
    company,
    employees
  };
};

/**
 * ローカルストレージからすべてのテストデータを削除する
 */
export const clearAllTestData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kaizen_users');
    localStorage.removeItem('kaizen_user_info');
    localStorage.removeItem('kaizen_company_info');
    localStorage.removeItem('kaizen_employees');
    console.log('すべてのテストデータを削除しました');
  }
};
