const TOKEN_KEY = 'aib_token';
const USER_KEY = 'aib_user';

/**
 * 获取存储的认证令牌字符串。
 * @returns {string} 存储的令牌字符串；若不存在则返回空字符串。
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

/**
 * 将提供的令牌保存到 localStorage 中（仅在令牌为真值时）。
 * @param {string} t - 要保存的令牌；若为假值（例如 `''`, `null`, `undefined`）则不执行任何操作。
 */
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
}

/**
 * 从 localStorage 中移除用于存储认证 token 的项。
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 从 localStorage 中读取并解析用户数据。
 *
 * 如果未找到数据或数据不是有效的 JSON，则返回 null。
 * @returns {Object|null} 解析后的用户对象；当不存在或解析失败时返回 `null`。
 */
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * 将用户对象序列化并存储到 localStorage 中（仅当提供非空值时）。
 * @param {Object} u - 要持久化的用户数据对象；如果为 falsy（例如 null 或 undefined），则不执行任何操作。
 */
export function setUser(u) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
}

/**
 * 从 localStorage 中删除与 USER_KEY 对应的用户数据。
 */
export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

/**
 * 判断当前是否已登录（基于本地存储中是否存在认证 token）。
 *
 * @returns {boolean} `true` if a token exists in storage, `false` otherwise.
 */
export function isLoggedIn() {
  return !!getToken();
}