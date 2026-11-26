// Only anonymous, read-only endpoints are accepted here.
function createPublicGet(platform, baseUrl) {
  return function publicGet(path, data) {
    let task;
    const promise = new Promise((resolve, reject) => {
      if (!['/catalogue', '/availability', '/availability/next'].includes(path)) {
        reject(new Error('不支持的公开查询。')); return;
      }
      try {
        task = platform.request({
          url: baseUrl().replace(/\/$/, '') + path,
          method: 'GET', data: data || {}, timeout: 12000,
          success(response) {
            if (response.statusCode === 200) resolve(response.data);
            else reject(new Error('暂时无法查询，请稍后重试。'));
          },
          fail() { reject(new Error('连接中断，请检查网络后重试。')); }
        });
      } catch (_) { reject(new Error('暂时无法连接，请稍后重试。')); }
    });
    return { promise, abort() { if (task && task.abort) task.abort(); } };
  };
}
module.exports = { createPublicGet };
