import { isLoggedIn, clearToken, clearUser, setUser } from './state.js';
import { me } from './api.js';
import { initAuthUI } from './auth.js';
import { initChatUI } from './chat.js';

/**
 * 隐藏所有具有 `view` 类的元素并显示指定 id 的视图元素。
 * @param {string} id - 要显示的视图元素的 DOM id。 */
function show(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

/**
 * 显示主应用视图并初始化聊天界面。
 *
 * 调用后页面切换至应用主视图并启动聊天相关的 UI 初始化流程。
 */
async function enterApp() {
  show('app-view');
  initChatUI();
}

/**
 * 显示认证视图并初始化认证界面；认证成功后切换到主应用界面。
 */
async function enterAuth() {
  show('auth-view');
  initAuthUI({ onAuthenticated: enterApp });
}

/**
 * 初始化并引导应用：注册登出处理器，检查会话并根据令牌状态切换到认证界面或主界面。
 *
 * 如果存在登出按钮，注册其点击处理以清除会话并刷新页面；如果没有登录则进入认证流程；若已登录则验证令牌、设置当前用户并进入主界面；在令牌验证失败时清除会话并重新进入认证流程。
 */
async function bootstrap() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearToken();
      clearUser();
      location.reload();
    });
  }

  if (!isLoggedIn()) {
    await enterAuth();
    return;
  }

  // Validate token and fetch profile
  try {
    const profile = await me();
    setUser({ email: profile.user_email, role: profile.user_role, id: profile.user_id });
    await enterApp();
  } catch (err) {
    console.warn('Token invalid, returning to auth', err);
    clearToken();
    clearUser();
    await enterAuth();
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);