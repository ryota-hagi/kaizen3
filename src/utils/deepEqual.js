/**
 * 2つの値が深く等しいかどうかを比較する関数
 * lodash/isEqualの代替として使用
 * 
 * @param {any} a - 比較する最初の値
 * @param {any} b - 比較する2番目の値
 * @returns {boolean} - 2つの値が等しい場合はtrue、そうでない場合はfalse
 */
export function isEqual(a, b) {
  // 基本的な等価性チェック
  if (a === b) return true;
  
  // nullまたはundefinedのチェック
  if (a == null || b == null) return a === b;
  
  // 型のチェック
  const typeA = typeof a;
  const typeB = typeof b;
  
  if (typeA !== typeB) return false;
  
  // プリミティブ型の場合は既にチェック済み
  if (typeA !== 'object') return a === b;
  
  // 配列のチェック
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    
    return true;
  }
  
  // 配列でない場合は一方だけが配列であってはならない
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  // オブジェクトのチェック
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  // すべてのキーがbに存在し、値が等しいことを確認
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }
  
  return true;
}
