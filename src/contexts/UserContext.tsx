'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserInfo, Employee } from '../utils/api'
import { getFromLocalStorage, saveToLocalStorage, removeFromLocalStorage, debugLocalStorage } from '../utils/localStorage'

// ローカルストレージのキー
const USER_STORAGE_KEY = 'kaizen_user_info'
const USERS_STORAGE_KEY = 'kaizen_users'

// コンテキストの型定義
interface UserContextType {
  currentUser: UserInfo | null
  users: UserInfo[]
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: Omit<UserInfo, 'id' | 'createdAt' | 'lastLogin'>, password: string) => Promise<boolean>
  updateUserProfile: (userData: Partial<UserInfo>) => Promise<boolean>
  updateUser: (userId: string, userData: Partial<UserInfo>) => Promise<boolean> // 管理者用ユーザー編集関数
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  getUserById: (id: string) => UserInfo | undefined
  inviteUser: (userData: Omit<UserInfo, 'id' | 'createdAt' | 'lastLogin'>) => Promise<boolean>
  deleteUser: (userId: string) => Promise<boolean>
  getEmployees: () => Employee[] // 従業員一覧を取得する関数
}

// パスワード情報を含むユーザーデータの型
interface UserWithPassword {
  user: UserInfo
  password: string
}

// デフォルト値
const defaultUserContext: UserContextType = {
  currentUser: null,
  users: [],
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  register: async () => false,
  updateUserProfile: async () => false,
  updateUser: async () => false,
  changePassword: async () => false,
  getUserById: () => undefined,
  inviteUser: async () => false,
  deleteUser: async () => false,
  getEmployees: () => []
}

// コンテキストの作成
const UserContext = createContext<UserContextType>(defaultUserContext)

// コンテキストを使用するためのカスタムフック
export const useUser = () => useContext(UserContext)

// ローカルストレージからユーザー情報を読み込む関数
const loadUserDataFromLocalStorage = (
  setCurrentUser: React.Dispatch<React.SetStateAction<UserInfo | null>>,
  setUsers: React.Dispatch<React.SetStateAction<UserInfo[]>>,
  setUserPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // デバッグ用にローカルストレージの内容を表示
  debugLocalStorage();
  
  // まず全ユーザー情報を読み込む（ユーザーリストとパスワードを確実に読み込むため）
  const parsedData = getFromLocalStorage(USERS_STORAGE_KEY, []) as UserWithPassword[];
  
  if (parsedData && parsedData.length > 0) {
    // ユーザー情報とパスワードを分離
    const usersList = parsedData.map(item => {
      const user = item.user;
      
      // ステータスが設定されていない場合は、適切なステータスを設定
      if (!user.status) {
        if (user.isInvited) {
          user.status = '招待中'
        } else if (user.lastLogin) {
          // 最終ログイン日付があれば「ログアウト中」
          user.status = 'ログアウト中'
        } else {
          // デフォルトは招待中
          user.status = '招待中'
        }
      }
      
      return user;
    });
    
    const passwordsMap = parsedData.reduce((acc, item) => {
      acc[item.user.id] = item.password
      return acc
    }, {} as Record<string, string>)
    
    setUsers(usersList)
    setUserPasswords(passwordsMap)
    
    console.log('ユーザーリストを読み込みました:', usersList.length, 'ユーザー')
    console.log('パスワード情報を読み込みました:', Object.keys(passwordsMap).length, 'エントリ')
  } else {
    console.log('ユーザーリストが見つかりません')
  }

  // 次に現在のユーザー情報を読み込む
  const parsedUserInfo = getFromLocalStorage(USER_STORAGE_KEY, null);
  
  if (parsedUserInfo) {
    // ステータスが設定されていない場合は、アクティブに設定
    if (!parsedUserInfo.status) {
      parsedUserInfo.status = 'アクティブ'
    }
    setCurrentUser(parsedUserInfo)
    setIsAuthenticated(true)
    console.log('現在のユーザー情報を読み込みました:', parsedUserInfo.username)
  } else {
    console.log('現在のユーザー情報が見つかりません')
  }
}

// プロバイダーコンポーネント
export const UserContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({})
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  // 初期化時にローカルストレージからデータを読み込む
  useEffect(() => {
    loadUserDataFromLocalStorage(setCurrentUser, setUsers, setUserPasswords, setIsAuthenticated);
  }, [])

  // ページのリフレッシュ時にもローカルストレージからデータを読み込む
  useEffect(() => {
    // ページがアクティブになったときにデータを再読み込み
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUserDataFromLocalStorage(setCurrentUser, setUsers, setUserPasswords, setIsAuthenticated);
      }
    };

    // ページがフォーカスを取得したときにデータを再読み込み
    const handleFocus = () => {
      loadUserDataFromLocalStorage(setCurrentUser, setUsers, setUserPasswords, setIsAuthenticated);
    };

    // イベントリスナーを登録
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', (event) => {
      // bfcacheから復元された場合も再読み込み
      if (event.persisted) {
        loadUserDataFromLocalStorage(setCurrentUser, setUsers, setUserPasswords, setIsAuthenticated);
      }
    });

    // クリーンアップ関数
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', (event) => {
        if (event.persisted) {
          loadUserDataFromLocalStorage(setCurrentUser, setUsers, setUserPasswords, setIsAuthenticated);
        }
      });
    };
  }, []);

// ログイン処理
const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
  console.log('ログイン試行:', usernameOrEmail)
  console.log('現在のユーザー数:', users.length)
  
  // デバッグ用にローカルストレージの内容を表示
  debugLocalStorage();
  
  // ユーザー名またはメールアドレスでユーザーを検索
  const user = users.find(u => u.username === usernameOrEmail || u.email === usernameOrEmail)
  
  if (!user) {
    console.log('ユーザーが見つかりません:', usernameOrEmail)
    return false // ユーザーが見つからない
  }
  
  console.log('ユーザーが見つかりました:', user.username)
  
  // パスワードの検証
  const storedPassword = userPasswords[user.id]
  if (!storedPassword) {
    console.log('パスワードが保存されていません')
    return false // パスワードが保存されていない
  }
  
  if (storedPassword !== password) {
    console.log('パスワードが一致しません')
    return false // パスワードが一致しない
  }
  
  console.log('パスワードが一致しました')
  
  // 最終ログイン日時を更新し、招待状態を解除、ステータスをアクティブに設定
  const updatedUser = {
    ...user,
    lastLogin: new Date().toISOString(),
    isInvited: false, // ログイン時に招待状態を解除（後方互換性のため）
    status: 'アクティブ' as const // ログイン時にステータスをアクティブに設定
  }
  
  // 現在のユーザーを設定
  setCurrentUser(updatedUser)
  setIsAuthenticated(true)
  
  // ユーザーリストも更新
  const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u)
  setUsers(updatedUsers)
  
  // ローカルストレージに保存
  saveToLocalStorage(USER_STORAGE_KEY, updatedUser);
  
  // ユーザーリストをローカルストレージに保存
  const usersWithPasswords = updatedUsers.map(u => ({
    user: u,
    password: userPasswords[u.id]
  }))
  saveToLocalStorage(USERS_STORAGE_KEY, usersWithPasswords);
  
  return true
}

// ログアウト処理
const logout = () => {
  if (currentUser) {
    console.log('ログアウト処理を開始:', currentUser.username)
    
    // ユーザーのステータスを「ログアウト中」に更新
    const updatedUser = {
      ...currentUser,
      status: 'ログアウト中' as const
    }
    
    // ユーザーリストを更新
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u)
    setUsers(updatedUsers)
    
    // パスワード情報を確実に保持
    const usersWithPasswords = updatedUsers.map(u => ({
      user: u,
      password: userPasswords[u.id] || '' // パスワードがない場合は空文字を設定
    }))
    
    // ユーザーリストをローカルストレージに保存
    saveToLocalStorage(USERS_STORAGE_KEY, usersWithPasswords);
    console.log('ユーザーリストを更新しました:', updatedUsers.length, 'ユーザー')
  }
  
  // 現在のユーザーをクリア
  setCurrentUser(null)
  setIsAuthenticated(false)
  
  // ローカルストレージからユーザー情報を削除
  removeFromLocalStorage(USER_STORAGE_KEY);
  console.log('現在のユーザー情報を削除しました')
  
  // デバッグ用にローカルストレージの内容を表示
  debugLocalStorage();
}

// ユーザー登録処理
const register = async (
  userData: Omit<UserInfo, 'id' | 'createdAt' | 'lastLogin'>, 
  password: string
): Promise<boolean> => {
  console.log('ユーザー登録処理を開始:', userData.username);
  
  // ユーザー名が既に存在するか確認
  if (users.some(u => u.username === userData.username)) {
    console.log('ユーザー名が既に使用されています:', userData.username);
    return false // ユーザー名が既に使用されている
  }
  
  // メールアドレスが既に存在するか確認
  if (users.some(u => u.email === userData.email)) {
    console.log('メールアドレスが既に使用されています:', userData.email);
    return false // メールアドレスが既に使用されている
  }
  
  // 新しいユーザーを作成
  const newUser: UserInfo = {
    id: Date.now().toString(),
    ...userData,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    status: 'アクティブ' as const // 登録時はアクティブ状態
  }
  
  console.log('新しいユーザーを作成しました:', newUser);
  
  // ユーザーリストを更新
  const updatedUsers = [...users, newUser]
  setUsers(updatedUsers)
  
  // パスワードを保存
  const updatedPasswords = {
    ...userPasswords,
    [newUser.id]: password
  }
  setUserPasswords(updatedPasswords)
  
  // 現在のユーザーとして設定
  setCurrentUser(newUser)
  setIsAuthenticated(true)
  
  // ユーザー情報をローカルストレージに保存
  saveToLocalStorage(USER_STORAGE_KEY, newUser);
  
  // ユーザーリストをローカルストレージに保存
  const usersWithPasswords = updatedUsers.map(u => ({
    user: u,
    password: u.id === newUser.id ? password : updatedPasswords[u.id]
  }))
  saveToLocalStorage(USERS_STORAGE_KEY, usersWithPasswords);
  
  // デバッグ用にローカルストレージの内容を表示
  debugLocalStorage();
  
  return true
}

  // ユーザープロフィールの更新
  const updateUserProfile = async (userData: Partial<UserInfo>): Promise<boolean> => {
    if (!currentUser) {
      return false // ログインしていない
    }
    
    // ユーザー名の変更がある場合、重複チェック
    if (userData.username && userData.username !== currentUser.username) {
      if (users.some(u => u.username === userData.username)) {
        return false // ユーザー名が既に使用されている
      }
    }
    
    // メールアドレスの変更がある場合、重複チェック
    if (userData.email && userData.email !== currentUser.email) {
      if (users.some(u => u.email === userData.email)) {
        return false // メールアドレスが既に使用されている
      }
    }
    
    // ユーザー情報を更新
    const updatedUser = {
      ...currentUser,
      ...userData
    }
    
    // 現在のユーザーを更新
    setCurrentUser(updatedUser)
    
    // 認証状態を維持
    setIsAuthenticated(true)
    
    // ユーザーリストも更新
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u)
    setUsers(updatedUsers)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
      
      // ユーザーリストをローカルストレージに保存
      const usersWithPasswords = updatedUsers.map(u => ({
        user: u,
        password: userPasswords[u.id]
      }))
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersWithPasswords))
    }
    
    return true
  }

  // IDでユーザーを取得
  const getUserById = (id: string): UserInfo | undefined => {
    return users.find(u => u.id === id)
  }
  
  // ユーザー招待処理
  const inviteUser = async (userData: Omit<UserInfo, 'id' | 'createdAt' | 'lastLogin'>): Promise<boolean> => {
    // メールアドレスが既に存在するか確認
    if (users.some(u => u.email === userData.email)) {
      return false // メールアドレスが既に使用されている
    }
    
    // 招待ユーザーを作成（仮のユーザー名を生成）
    const tempUsername = `invited_${Date.now()}`
    const newUser: UserInfo = {
      id: Date.now().toString(),
      username: userData.username || tempUsername,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role,
      companyId: userData.companyId,
      department: userData.department,
      position: userData.position,
      isInvited: true, // 後方互換性のため
      status: '招待中' as const, // 招待時のステータスを設定
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
    
    // ユーザーリストを更新
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    
    // 仮パスワードを生成
    const tempPassword = Math.random().toString(36).slice(-8)
    const updatedPasswords = {
      ...userPasswords,
      [newUser.id]: tempPassword
    }
    setUserPasswords(updatedPasswords)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      // ユーザーリストをローカルストレージに保存
      const usersWithPasswords = updatedUsers.map(u => ({
        user: u,
        password: u.id === newUser.id ? tempPassword : updatedPasswords[u.id]
      }))
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersWithPasswords))
      
      // 実際のシステムでは、ここでメール送信APIを呼び出す
      console.log(`招待メールを送信: ${userData.email}, 仮パスワード: ${tempPassword}`)
    }
    
    return true
  }

  // ユーザー削除処理
  const deleteUser = async (userId: string): Promise<boolean> => {
    // 現在のユーザーは削除できない
    if (currentUser && userId === currentUser.id) {
      return false
    }
    
    // ユーザーリストから削除
    const updatedUsers = users.filter(u => u.id !== userId)
    setUsers(updatedUsers)
    
    // パスワード情報も削除
    const updatedPasswords = { ...userPasswords }
    delete updatedPasswords[userId]
    setUserPasswords(updatedPasswords)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      // ユーザーリストをローカルストレージに保存
      const usersWithPasswords = updatedUsers.map(u => ({
        user: u,
        password: updatedPasswords[u.id]
      }))
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersWithPasswords))
    }
    
    return true
  }

  // パスワード変更処理
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!currentUser) {
      return false // ログインしていない
    }
    
    // 現在のパスワードを検証
    if (userPasswords[currentUser.id] !== currentPassword) {
      return false // 現在のパスワードが一致しない
    }
    
    // パスワードを更新
    const updatedPasswords = {
      ...userPasswords,
      [currentUser.id]: newPassword
    }
    setUserPasswords(updatedPasswords)
    
    // 認証状態を維持
    setIsAuthenticated(true)
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      // ユーザーリストをローカルストレージに保存
      const usersWithPasswords = users.map(u => ({
        user: u,
        password: u.id === currentUser.id ? newPassword : updatedPasswords[u.id]
      }))
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersWithPasswords))
    }
    
    return true
  }

  // 管理者用ユーザー編集関数
  const updateUser = async (userId: string, userData: Partial<UserInfo>): Promise<boolean> => {
    // 対象ユーザーを取得
    const user = users.find(u => u.id === userId)
    if (!user) {
      return false // ユーザーが見つからない
    }
    
    // ユーザー名の変更がある場合、重複チェック
    if (userData.username && userData.username !== user.username) {
      if (users.some(u => u.username === userData.username && u.id !== userId)) {
        return false // ユーザー名が既に使用されている
      }
    }
    
    // メールアドレスの変更がある場合、重複チェック
    if (userData.email && userData.email !== user.email) {
      if (users.some(u => u.email === userData.email && u.id !== userId)) {
        return false // メールアドレスが既に使用されている
      }
    }
    
    // ユーザー情報を更新
    const updatedUser = {
      ...user,
      ...userData
    }
    
    // ユーザーリストを更新
    const updatedUsers = users.map(u => u.id === userId ? updatedUser : u)
    setUsers(updatedUsers)
    
    // 現在のユーザーの場合は、currentUserも更新
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(updatedUser)
    }
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      // 現在のユーザーの場合は、USER_STORAGE_KEYも更新
      if (currentUser && currentUser.id === userId) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
      }
      
      // ユーザーリストをローカルストレージに保存
      const usersWithPasswords = updatedUsers.map(u => ({
        user: u,
        password: userPasswords[u.id]
      }))
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersWithPasswords))
    }
    
    return true
  }
  
  // 従業員一覧を取得する関数
  const getEmployees = (): Employee[] => {
    // マイページの従業員情報をローカルストレージから取得
    if (typeof window !== 'undefined') {
      const EMPLOYEES_STORAGE_KEY = 'kaizen_employees'
      const savedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
      
      if (savedEmployees) {
        try {
          return JSON.parse(savedEmployees)
        } catch (error) {
          console.error('Failed to parse employees from localStorage:', error)
        }
      }
    }
    
    // ローカルストレージにデータがない場合はデフォルト値を返す
    return [
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
    ]
  }

  // コンテキスト値
  const value: UserContextType = {
    currentUser,
    users,
    isAuthenticated,
    login,
    logout,
    register,
    updateUserProfile,
    updateUser,
    changePassword,
    getUserById,
    inviteUser,
    deleteUser,
    getEmployees
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
