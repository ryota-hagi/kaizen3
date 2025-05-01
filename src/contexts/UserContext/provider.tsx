'use client'

import React, { useState, useEffect, ReactNode } from 'react'
import { UserInfo } from '@/utils/api';
import { UserContext, UserContextType, defaultUserContext } from './context';
import { loadUserDataFromLocalStorage, USER_STORAGE_KEY, USERS_STORAGE_KEY } from './utils';
import {
  login,
  logout,
  register,
  updateUserProfile,
  getUserById,
  deleteUser,
  changePassword,
  updateUser,
  getEmployees,
  deleteCompanyAccount,
  inviteUser,
  verifyInviteToken,
  completeInvitation
} from './operations/index';

// プロバイダーコンポーネント
export const UserContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null); // 初期値はnull
  const [users, setUsers] = useState<UserInfo[]>([]); // 初期値は空配列
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({}); // 初期値は空オブジェクト
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // 初期値はfalse
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // 初期化フラグ

  // 初期化時にローカルストレージからデータを読み込む（マウント時のみ実行）
  useEffect(() => {
    // 初期化処理が複数回実行されないようにフラグを確認
    if (isInitialized) {
      console.log('[Provider] useEffect: 既に初期化済みのため、処理をスキップします');
      return;
    }
    
    console.log('[Provider] useEffect: 初期化処理を実行します');
    setIsInitialized(true);
    if (typeof window !== 'undefined') {
      // ユーザーデータを読み込む
      const { users: loadedUsers } = loadUserDataFromLocalStorage(setUsers, setUserPasswords);
      console.log('[Provider] Loaded users:', loadedUsers.length);
      
      // 招待中のユーザーを確認
      const invitedUsers = loadedUsers.filter(user => user.status === '招待中' || user.isInvited === true);
      console.log('[Provider] Invited users:', invitedUsers.length);
      
      // 招待中のユーザーの詳細をログに出力
      invitedUsers.forEach((user, index) => {
        console.log(`[Provider] Invited user ${index}:`, {
          id: user.id,
          email: user.email,
          inviteToken: user.inviteToken,
          status: user.status,
          isInvited: user.isInvited
        });
      });
      
      // URLパラメータから招待トークンを取得（存在する場合）
      let urlToken = '';
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        urlToken = urlParams.get('token') || '';
        if (urlToken) {
          console.log('[Provider] URL token found:', urlToken);
          
          // トークンに一致するユーザーを検索
          const matchingUser = loadedUsers.find(user => user.inviteToken === urlToken);
          if (matchingUser) {
            console.log('[Provider] Found user with matching token:', matchingUser.email);
          } else {
            console.log('[Provider] No user found with matching token');
            
            // 全ユーザーのトークンをログに出力
            loadedUsers.forEach((user, index) => {
              console.log(`[Provider] User ${index} token:`, user.inviteToken);
            });
          }
        }
      }
      
      // 現在ログイン中のユーザー情報も復元
      const savedUserInfo = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUserInfo) {
        try {
          const parsedUserInfo = JSON.parse(savedUserInfo);
          // 保存されているユーザーが実際にリストに存在するか確認
          if (loadedUsers.some(u => u.id === parsedUserInfo.id)) {
            if (!parsedUserInfo.status) {
              parsedUserInfo.status = 'アクティブ';
            }
            setCurrentUser(parsedUserInfo);
            setIsAuthenticated(true);
            console.log('[Provider Init] Restored current user:', parsedUserInfo.email);
          } else {
            // ユーザーリストに存在しない場合でも、クリアせずに使用する
            console.warn('[Provider Init] Saved current user not found in user list. Using anyway.');
            if (!parsedUserInfo.status) {
              parsedUserInfo.status = 'アクティブ';
            }
            setCurrentUser(parsedUserInfo);
            setIsAuthenticated(true);
            
            // ユーザーリストに追加
            const updatedUsers = [...loadedUsers, parsedUserInfo];
            setUsers(updatedUsers);
            
            // ローカルストレージに保存
            const usersToSave = updatedUsers.map(u => ({
              user: u,
              password: ''
            }));
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersToSave));
            console.log('[Provider Init] Added current user to user list:', parsedUserInfo.email);
          }
        } catch (error) {
          console.error('[Provider Init] Failed to parse current user info:', error);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      
      // 初期化完了後に再度ユーザーデータを読み込む（招待ユーザーが確実に読み込まれるようにするため）
      setTimeout(() => {
        console.log('[Provider] Re-loading user data after initialization');
        loadUserDataFromLocalStorage(setUsers, setUserPasswords);
      }, 500);
    }
  }, []);

  // コンテキスト値
  const value: UserContextType = {
    currentUser,
    users,
    isAuthenticated,
    setUsers, // setUsers関数を追加
    login: (usernameOrEmail, password) => login(
      usernameOrEmail, 
      password, 
      setCurrentUser, 
      setUsers, 
      setUserPasswords, 
      setIsAuthenticated
    ),
    logout: () => logout(
      currentUser, 
      setCurrentUser, 
      setUsers, 
      setUserPasswords, 
      setIsAuthenticated
    ),
    register: (userData, password) => register(
      userData, 
      password, 
      setCurrentUser, 
      setUsers, 
      setUserPasswords, 
      setIsAuthenticated
    ),
    updateUserProfile: (userData) => updateUserProfile(
      userData, 
      currentUser, 
      setCurrentUser, 
      setUsers, 
      setUserPasswords
    ),
    updateUser: (userId, userData) => updateUser(
      userId, 
      userData, 
      currentUser, 
      setCurrentUser, 
      setUsers, 
      setUserPasswords
    ),
    changePassword: (currentPassword, newPassword) => changePassword(
      currentPassword, 
      newPassword, 
      currentUser, 
      setUsers, 
      setUserPasswords
    ),
    getUserById: (id) => getUserById(id, users),
    deleteUser: (userId) => deleteUser(
      userId, 
      currentUser, 
      setUsers, 
      setUserPasswords
    ),
    deleteCompanyAccount: () => deleteCompanyAccount(
      currentUser,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    ),
    inviteUser: (inviteData) => inviteUser(
      inviteData,
      currentUser,
      setUsers,
      setUserPasswords
    ),
    verifyInviteToken: (token) => verifyInviteToken(token, users), // 非同期関数として呼び出し
    completeInvitation: (token, userData) => completeInvitation(
      token,
      userData,
      setCurrentUser,
      setUsers,
      setUserPasswords,
      setIsAuthenticated
    ),
    getEmployees
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
