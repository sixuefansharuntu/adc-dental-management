function passwordRules(password) {
  return [
    { text: '长度 8—128 位', met: password.length >= 8 && password.length <= 128 },
    { text: '至少 1 个英文字母（A–Z 或 a–z）', met: /[a-z]/i.test(password) },
    { text: '至少 1 个数字（0–9）', met: /[0-9]/.test(password) },
  ];
}

function loginFailure(status) {
  switch (status) {
    case 400: return '账号或密码格式无效，请检查后重试。';
    case 401: return '账号或密码不正确，请核对后重试。';
    case 403: return '当前入口无法登录，请确认已打开正确的登录页面。';
    case 429: return '登录尝试过于频繁，请稍后再试。';
    case 408:
    case 504: return '登录请求超时，请检查网络后重试。';
    default: return '登录服务暂时无法使用，请稍后再试。';
  }
}

module.exports = { passwordRules, loginFailure };
