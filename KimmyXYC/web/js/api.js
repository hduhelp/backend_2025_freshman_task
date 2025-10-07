import { getToken } from './state.js';

/**
 * 发起带自动令牌注入与统一响应解析的 HTTP 请求并返回解析后的响应内容。
 *
 * 发送请求时会在请求头中添加 `Accept: application/json`，若存在 token 则添加 `Authorization: Bearer <token>`。
 *
 * @param {string} path - 请求的 URL 或相对路径。
 * @param {Object} [options] - 请求选项。
 * @param {string} [options.method='GET'] - HTTP 方法。
 * @param {Object} [options.headers={}] - 额外请求头，会与默认头合并（默认头可被覆盖）。
 * @param {string|Blob|FormData|URLSearchParams|ReadableStream|undefined} [options.body] - 请求体。
 * @returns {any} 如果响应 Content-Type 包含 `application/json` 则返回解析后的 JSON，否则返回响应文本。
 * @throws {Error} 当响应状态不是 ok 时，抛出包含服务端错误信息或状态文本的 Error。
 */
async function api(path, { method = 'GET', headers = {}, body = undefined } = {}) {
  const h = { 'Accept': 'application/json', ...headers };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { method, headers: h, body });
  if (!res.ok) {
    let errText = await res.text().catch(() => '');
    try { const j = JSON.parse(errText); errText = j.error || errText; } catch {}
    throw new Error(errText || `${res.status} ${res.statusText}`);
  }
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

/**
 * 注册新用户并返回服务器的响应数据。
 * @param {string} email - 用户邮箱。
 * @param {string} password - 用户密码。
 * @param {string} [role='free'] - 用户角色，常见取值包括 'free'、'pro'、'admin'；默认为 'free'。
 * @returns {any} 服务器返回的解析后响应（通常为 JSON，可能包含用户信息和/或认证令牌）。
 */
export async function register(email, password, role = 'free') {
  return api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
}

/**
 * 使用邮箱和密码对用户进行登录。
 * @param {string} email - 要登录的用户邮箱地址。
 * @param {string} password - 用户密码。
 * @returns {any} 服务器返回的解析结果（通常包含认证信息和用户数据）。
 */
export async function login(email, password) {
  return api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

/**
 * 获取当前已认证用户的信息。
 * @returns {Object} 当前用户的详细信息对象。
 */
export async function me() {
  return api('/api/me');
}

/**
 * 获取当前用户的会话列表。
 * @returns {Object[]} 包含会话对象的数组，每个对象表示一个会话。
 */
export async function listConversations() {
  return api('/api/conversations');
}

/**
 * 获取指定对话的消息列表。
 * @param {string|number} convId - 要检索消息的对话 ID。
 * @returns {Array<Object>} 该对话的消息数组。
 */
export async function getMessages(convId) {
  return api(`/api/conversations/${convId}/messages`);
}

/**
 * 向服务器发送一条聊天消息并返回服务器响应。
 *
 * @param {Object} options - 发送选项。
 * @param {number} [options.conversation_id=0] - 目标会话的 ID。
 * @param {string} [options.model='mock-mini'] - 使用的模型名称。
 * @param {string} [options.message=''] - 要发送的消息文本。
 * @returns {any} 服务器返回的已解析响应对象。
 */
export async function sendChat({ conversation_id = 0, model = 'mock-mini', message = '' }) {
  return api('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id, model, message, stream: false }),
  });
}

/**
 * 以流式方式发送聊天消息并按事件逐块处理服务器返回的数据。
 *
 * @param {{conversation_id?: number, model?: string, message?: string}} params - 请求参数。
 * @param {number} [params.conversation_id=0] - 初始会话 ID，若为 0 则表示新会话。
 * @param {string} [params.model='mock-mini'] - 要使用的模型名称。
 * @param {string} [params.message=''] - 要发送的消息内容。
 * @param {{onChunk?: (chunk: string) => void, onDone?: (result: {conversation_id: number}) => void}} [options] - 回调配置。
 * @param {(chunk: string) => void} [options.onChunk] - 在接收到非 `done` 事件的数据段时被调用，参数为该数据字符串。
 * @param {(result: {conversation_id: number}) => void} [options.onDone] - 在接收到 `done` 事件或流结束时被调用，参数包含最新的 `conversation_id`。
 * @returns {{conversation_id: number}} 包含发送完成后（或服务器指示完成时）最终的会话 ID。
 */
export async function chatStream({ conversation_id = 0, model = 'mock-mini', message = '' }, { onChunk, onDone } = {}) {
  const res = await fetch('/api/chat?stream=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ conversation_id, model, message, stream: true }),
  });
  if (!res.ok || !res.body) {
    let t = await res.text().catch(() => '');
    try { const j = JSON.parse(t); t = j.error || t; } catch {}
    throw new Error(t || `${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let convId = conversation_id;

  const flushEvents = () => {
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const evt = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = evt.split('\n');
      let eventName = 'message';
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^\s*/, ''));
      }
      const data = dataLines.join('\n');
      if (eventName === 'done') {
        try {
          const obj = JSON.parse(data);
          if (obj.conversation_id) convId = obj.conversation_id;
        } catch {}
        if (onDone) onDone({ conversation_id: convId });
      } else {
        if (onChunk) onChunk(data);
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flushEvents();
  }
  // flush any remainder
  flushEvents();
  return { conversation_id: convId };
}

export const AllowedModelsByRole = {
  free: ['mock-mini', 'gpt-4o-mini'],
  pro: ['mock-mini', 'mock-pro', 'gpt-4o-mini', 'gpt-4o'],
  admin: ['mock-mini', 'mock-pro', 'mock-admin', 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1'],
};

/**
 * 检查指定角色是否允许使用某个模型。
 * @param {string} role - 用户角色名称（例如 'free'、'pro'、'admin'）。
 * @param {string|undefined|null} model - 要验证的模型名称；若为假值则视为允许。
 * @returns {boolean} `true` 如果 model 为假值 或者该角色的允许列表包含该模型，`false` 否则.
 */
export function roleAllowsModel(role, model) {
  if (!model) return true;
  const list = AllowedModelsByRole[role] || [];
  return list.includes(model);
}