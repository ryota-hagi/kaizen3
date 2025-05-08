'use client'

import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { migrateWorkflowsToSupabase } from '@/utils/migrateToSupabase';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabaseClient';

export default function MigrateWorkflowsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { currentUser } = useUser();
  const [step, setStep] = useState<'check' | 'migrate' | 'complete'>('check');
  const [tablesExist, setTablesExist] = useState(false);
  
  const [projectId, setProjectId] = useState('');
  
  // テーブルの存在確認
  const checkTables = async () => {
    if (!projectId) {
      alert('プロジェクトIDを入力してください');
      return false;
    }
    
    setIsLoading(true);
    try {
      // MCPを使用してテーブル一覧を取得
      const response = await fetch('/api/workflows/supabase-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'list_tables',
          params: {
            projectId
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`テーブル確認エラー: ${response.status}`);
      }
      
      const data = await response.json();
      
      // workflowsテーブルが存在するか確認
      const hasWorkflowsTable = data.some((table: any) => table.name === 'workflows');
      
      setTablesExist(hasWorkflowsTable);
      if (hasWorkflowsTable) {
        setStep('migrate');
      }
      
      return hasWorkflowsTable;
    } catch (error) {
      console.error('テーブル確認エラー:', error);
      setTablesExist(false);
      alert(`テーブル確認に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // テーブル作成
  const createTables = async () => {
    if (!projectId) {
      alert('プロジェクトIDを入力してください');
      return false;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows/create-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId
        })
      });
      
      if (!response.ok) {
        throw new Error(`テーブル作成エラー: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTablesExist(true);
        setStep('migrate');
        return true;
      } else {
        throw new Error(data.message || 'テーブル作成に失敗しました');
      }
    } catch (error) {
      console.error('テーブル作成エラー:', error);
      alert(`テーブル作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // RLSポリシーの適用
  const applyRlsPolicies = async () => {
    if (!projectId) {
      alert('プロジェクトIDを入力してください');
      return false;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows/apply-rls-policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId
        })
      });
      
      if (!response.ok) {
        throw new Error(`RLSポリシー適用エラー: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return true;
      } else {
        throw new Error(data.message || 'RLSポリシーの適用に失敗しました');
      }
    } catch (error) {
      console.error('RLSポリシー適用エラー:', error);
      alert(`RLSポリシーの適用に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // データ移行
  const handleMigrate = async () => {
    if (!projectId) {
      alert('プロジェクトIDを入力してください');
      return;
    }
    
    setIsLoading(true);
    try {
      const migrationResult = await migrateWorkflowsToSupabase(projectId);
      setResult(migrationResult);
      
      if (migrationResult.success) {
        setStep('complete');
      }
    } catch (error) {
      console.error('移行エラー:', error);
      setResult({ success: false, message: '移行処理中にエラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 会社名を取得
  const getCompanyName = () => {
    // ローカルストレージから会社情報を取得
    const storedCompanyInfo = typeof window !== 'undefined' ? localStorage.getItem('kaizen_company_info') : null;
    if (storedCompanyInfo) {
      try {
        const companyInfo = JSON.parse(storedCompanyInfo);
        return companyInfo.name || '';
      } catch (error) {
        console.error('会社情報の解析エラー:', error);
      }
    }
    return '';
  };
  
  return (
    <DashboardLayout companyName={getCompanyName()}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">業務フローのデータ移行</h1>
        
        {step === 'check' && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">ステップ1: テーブル確認</h2>
            <p className="mb-4">
              業務フローデータを保存するためのテーブルが存在するか確認します。
              テーブルが存在しない場合は、新しく作成します。
            </p>
            
            <div className="mb-4">
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                SupabaseプロジェクトのプロジェクトID
              </label>
              <input
                type="text"
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="例: abcdefghijklmnopqrst"
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Supabaseダッシュボードの「プロジェクト設定 &gt; 全般」から確認できます
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={checkTables}
                disabled={isLoading || !projectId}
                className="btn btn-primary"
              >
                {isLoading ? 'テーブル確認中...' : 'テーブルを確認'}
              </button>
              
              <button
                onClick={createTables}
                disabled={isLoading || !projectId}
                className="btn btn-secondary"
              >
                {isLoading ? 'テーブル作成中...' : 'テーブルを作成'}
              </button>
            </div>
          </div>
        )}
        
        {step === 'migrate' && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">ステップ2: データ移行</h2>
            <p className="mb-4">
              現在ローカルストレージに保存されている業務フローデータをSupabaseに移行します。
              移行後は権限管理機能が有効になり、共同編集が可能になります。
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={handleMigrate}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? '移行中...' : 'データ移行を実行'}
              </button>
              
              <button
                onClick={applyRlsPolicies}
                disabled={isLoading}
                className="btn btn-secondary"
              >
                {isLoading ? 'RLSポリシー適用中...' : 'RLSポリシーを適用'}
              </button>
            </div>
          </div>
        )}
        
        {step === 'complete' && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">ステップ3: 完了</h2>
            <p className="mb-4">
              データ移行が完了しました。業務フロー一覧ページから、移行されたデータを確認できます。
            </p>
            
            <button
              onClick={() => window.location.href = '/workflows'}
              className="btn btn-primary"
            >
              業務フロー一覧へ
            </button>
          </div>
        )}
        
        {result && (
          <div className={`bg-${result.success ? 'green' : 'red'}-50 p-6 rounded-lg shadow`}>
            <h3 className="text-lg font-semibold mb-2">
              {result.success ? '移行成功' : '移行失敗'}
            </h3>
            <p className="mb-4">{result.message}</p>
            
            {result.results && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">詳細結果:</h4>
                <ul className="list-disc pl-5">
                  {result.results.map((item: any, index: number) => (
                    <li key={index} className={item.success ? 'text-green-600' : 'text-red-600'}>
                      ID: {item.id} - {item.success ? '成功' : `失敗: ${item.error?.message || '不明なエラー'}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
