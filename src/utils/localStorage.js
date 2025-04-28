/**
 * ローカルストレージ操作のためのユーティリティ関数
 */

/**
 * ローカルストレージからデータを取得する
 * @param {string} key - ストレージのキー
 * @param {any} defaultValue - データが存在しない場合のデフォルト値
 * @returns {any} 取得したデータまたはデフォルト値
 */
export const getFromLocalStorage = (key, defaultValue = null) => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      console.log(`ローカルストレージに ${key} が見つかりません`);
      return defaultValue;
    }
    
    const parsedItem = JSON.parse(item);
    console.log(`ローカルストレージから ${key} を読み込みました:`, parsedItem);
    return parsedItem;
  } catch (error) {
    console.error(`ローカルストレージから ${key} の読み込みに失敗しました:`, error);
    return defaultValue;
  }
};

/**
 * ローカルストレージにデータを保存する
 * @param {string} key - ストレージのキー
 * @param {any} value - 保存するデータ
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveToLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return false;
  
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    console.log(`ローカルストレージに ${key} を保存しました:`, value);
    return true;
  } catch (error) {
    console.error(`ローカルストレージへの ${key} の保存に失敗しました:`, error);
    return false;
  }
};

/**
 * ローカルストレージからデータを削除する
 * @param {string} key - ストレージのキー
 * @returns {boolean} 削除が成功したかどうか
 */
export const removeFromLocalStorage = (key) => {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.removeItem(key);
    console.log(`ローカルストレージから ${key} を削除しました`);
    return true;
  } catch (error) {
    console.error(`ローカルストレージからの ${key} の削除に失敗しました:`, error);
    return false;
  }
};

/**
 * ローカルストレージの内容をコンソールに出力する（デバッグ用）
 */
export const debugLocalStorage = () => {
  if (typeof window === 'undefined') return;
  
  console.log('===== ローカルストレージの内容 =====');
  
  if (localStorage.length === 0) {
    console.log('ローカルストレージは空です');
    return;
  }
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      const value = JSON.parse(localStorage.getItem(key));
      console.log(`${key}:`, value);
    } catch (error) {
      console.log(`${key}: ${localStorage.getItem(key)} (パースできませんでした)`);
    }
  }
  
  console.log('=================================');
};
