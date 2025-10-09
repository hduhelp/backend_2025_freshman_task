import { setToken, setUser } from './state.js';
import { login, register, me } from './api.js';

/**
 * 初始化登录与注册表单的交互行为并在成功认证后更新本地认证状态。
 *
 * 在页面中查找具有特定 id 的登录/注册表单与相关输入和错误显示元素，绑定提交事件：提交时调用相应的 API（login 或 register），保存返回的 token，获取并存储当前用户信息，认证成功后调用可选回调。
 * @param {Object} [options] - 可选配置对象。
 * @param {Function} [options.onAuthenticated] - 在成功完成认证并更新用户状态后调用的回调函数（无参数）。
 */
export function initAuthUI({ onAuthenticated } = {}) {
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');

  const regForm = document.getElementById('register-form');
  const regEmail = document.getElementById('register-email');
  const regPassword = document.getElementById('register-password');
  const regRole = document.getElementById('register-role');
  const regError = document.getElementById('register-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    try {
      const resp = await login(loginEmail.value.trim(), loginPassword.value);
      setToken(resp.token);
      // Get me to store role/email consistently
      const profile = await me();
      setUser({ email: profile.user_email, role: profile.user_role, id: profile.user_id });
      if (onAuthenticated) onAuthenticated();
    } catch (err) {
      loginError.textContent = err.message || '登录失败';
    }
  });

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.textContent = '';
    try {
      const resp = await register(regEmail.value.trim(), regPassword.value, regRole.value);
      setToken(resp.token);
      const profile = await me();
      setUser({ email: profile.user_email, role: profile.user_role, id: profile.user_id });
      if (onAuthenticated) onAuthenticated();
    } catch (err) {
      regError.textContent = err.message || '注册失败';
    }
  });
}