import React, { useState, useEffect } from 'react'
import { Employee } from '../../utils/api'

interface WorkflowStep {
  id: string
  title: string
  description: string
  assignee: string
  timeRequired: number
  position: number
  cost?: number
  tools?: string
}

interface WorkflowBlockModalProps {
  step: WorkflowStep | null
  onSave: (step: WorkflowStep) => void
  onClose: () => void
}

export const WorkflowBlockModal: React.FC<WorkflowBlockModalProps> = ({ step, onSave, onClose }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [timeRequired, setTimeRequired] = useState(0)
  const [cost, setCost] = useState<number | undefined>(undefined)
  const [tools, setTools] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // 従業員情報を取得
  useEffect(() => {
    const savedEmployees = localStorage.getItem('kaizen_employees')
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees)
        setEmployees(parsedEmployees)
      } catch (error) {
        console.error('従業員情報の解析エラー:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (step) {
      setTitle(step.title)
      setDescription(step.description)
      setAssignee(step.assignee)
      setTimeRequired(step.timeRequired)
      setCost(step.cost)
      setTools(step.tools || '')
      
      // 担当者が従業員リストに存在するか確認
      if (employees.length > 0) {
        const employee = employees.find(emp => emp.name === step.assignee)
        setSelectedEmployee(employee || null)
      }
    } else {
      setTitle('')
      setDescription('')
      setAssignee('')
      setTimeRequired(0)
      setCost(undefined)
      setTools('')
      setSelectedEmployee(null)
    }
  }, [step, employees])

  // 担当者が変更されたときにコストを計算
  useEffect(() => {
    if (selectedEmployee && timeRequired > 0) {
      // 時給 × 所要時間（分）÷ 60で計算
      const calculatedCost = Math.round(selectedEmployee.hourlyRate * timeRequired / 60)
      setCost(calculatedCost)
    } else if (assignee === '自動化') {
      setCost(0)
    }
  }, [selectedEmployee, timeRequired, assignee])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const updatedStep: WorkflowStep = {
      id: step?.id || '',
      title,
      description,
      assignee,
      timeRequired,
      position: step?.position || 0,
      cost,
      tools: tools || undefined
    }
    
    onSave(updatedStep)
  }

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setAssignee(value)
    
    if (value === '自動化') {
      setSelectedEmployee(null)
      setCost(0)
    } else {
      const employee = employees.find(emp => emp.name === value)
      setSelectedEmployee(employee || null)
      
      if (employee && timeRequired > 0) {
        // 時給 × 所要時間（分）÷ 60で計算
        const calculatedCost = Math.round(employee.hourlyRate * timeRequired / 60)
        setCost(calculatedCost)
      }
    }
  }

  const handleTimeRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setTimeRequired(value)
    
    if (selectedEmployee && value > 0) {
      // 時給 × 所要時間（分）÷ 60で計算
      const calculatedCost = Math.round(selectedEmployee.hourlyRate * value / 60)
      setCost(calculatedCost)
    } else if (assignee === '自動化') {
      setCost(0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">
          {step ? 'ステップを編集' : '新規ステップを追加'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
              説明
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="assignee" className="block text-sm font-medium text-secondary-700 mb-1">
              担当者
            </label>
            <select
              id="assignee"
              value={assignee}
              onChange={handleAssigneeChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">担当者を選択</option>
              <option value="自動化">自動化</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.name}>
                  {employee.name} ({employee.position})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="timeRequired" className="block text-sm font-medium text-secondary-700 mb-1">
              所要時間（分）
            </label>
            <input
              type="number"
              id="timeRequired"
              value={timeRequired}
              onChange={handleTimeRequiredChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="cost" className="block text-sm font-medium text-secondary-700 mb-1">
              コスト（円）
            </label>
            <input
              type="number"
              id="cost"
              value={cost || 0}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              readOnly={selectedEmployee !== null || assignee === '自動化'}
            />
            {selectedEmployee && (
              <p className="text-xs text-secondary-500 mt-1">
                {selectedEmployee.name}の時給: {selectedEmployee.hourlyRate}円/時
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <label htmlFor="tools" className="block text-sm font-medium text-secondary-700 mb-1">
              ツール/設備
            </label>
            <input
              type="text"
              id="tools"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど"
            />
            <p className="text-xs text-secondary-500 mt-1">
              このブロックの業務工程を実行するために使う具体的なツールや設備名
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
