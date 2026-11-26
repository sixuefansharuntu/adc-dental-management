export function missingLoginInput(loginName: string, password: string) {
  if (!loginName.trim()) return '请输入账号。';
  if (!password) return '请输入密码。';
  return '';
}

export function loginFailure(error: unknown, demo = false) {
  const failure = error as { status?: number; name?: string; message?: string } | undefined;
  switch (failure?.status) {
    case 400: return demo ? '请选择可用的演示账号。' : '账号或密码格式无效，请检查后重试。';
    case 401: return demo ? '该演示账号当前不可用，请重新选择账号或稍后再试。' : '账号或密码不正确，请核对后重试。';
    case 403: return demo ? '演示入口当前不可用，请重新打开演示页面。' : '当前入口无法登录，请确认已打开正确的登录页面。';
    case 429: return '登录尝试过于频繁，请稍后再试。';
    case 408:
    case 504: return '登录请求超时，请检查网络后重试。';
  }
  if (failure?.name === 'AbortError' || failure?.name === 'TimeoutError') return '登录请求超时，请检查网络后重试。';
  if (typeof failure?.status === 'number') return '登录服务暂时无法使用，请稍后再试。';
  return '暂时无法连接登录服务，请检查网络后重试。';
}
