'use client'

import React from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function TemplatesPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">テンプレート</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            テンプレート機能は現在開発中です。今後のアップデートをお待ちください。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
