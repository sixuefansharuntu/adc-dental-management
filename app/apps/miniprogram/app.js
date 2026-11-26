// ADC 患者端小程序
// 请求统一经云函数 adcApi 转发到现有后端：体验版真机会校验"服务器域名必须已备案"，
// 本项目只有公网 IP，无法加入 request 合法域名，故改由云函数在云端出网。
const CLOUD_ENV = ''; // 留空使用默认云开发环境；如需指定，填 cloud1- 开头的那串

App({
    onLaunch() {
        if (!wx.cloud) {
            console.error('基础库过低，未提供云能力，请升级微信客户端或改用真机预览。');
            return;
        }
        wx.cloud.init(CLOUD_ENV ? { env: CLOUD_ENV, traceUser: true } : { traceUser: true });
    },
    globalData: {
        // 仅用于拼接相对路径；真正的网络请求由云函数发出
        apiBaseUrl: 'https://adc-review.test/api/v1',
        // 公众可用的预约入口（不再限定"仅本机合成"）
        localBookingEnabled: true,
        cloudEnvId: CLOUD_ENV,
    },
});
