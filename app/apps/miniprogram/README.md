# ADC 患者端小程序

源码包含诊所与预约时段查询、预约提交、本人预约列表、改约、取消、合成患者注册及修改密码。也可以直接在手机浏览器使用仓库首页的患者预约入口。

## 本机联调

在 `app` 目录安装依赖并初始化本地合成环境后，运行 `npm run mini:demo`。在微信开发者工具导入终端显示的临时 `projectPath`，选择本机联调环境。工具会启动本机临时 API 并生成随机合成账号，保持终端开启。停止时在终端输入 `stop`。

## 连接自有 HTTPS 后端

1. 先部署网页和 API，参见[服务器部署](../../deploy/README.md)。使用自己的小程序 AppID 导入本目录，并绑定自己的云开发环境。
2. 在 `app.js` 中填写自己的 API 地址 `https://你的域名/api/v1`，如需指定云环境，填写 `CLOUD_ENV`。
3. 部署 `cloudfunctions/adcApi`，在自己的云函数环境填写 `ADC_PUBLIC_BASE` 为 `https://你的域名/api/v1`、`ADC_API_BASE` 为 `https://你的域名/api/v1/mp`。
4. 要联调预约操作，在自己的后端和云函数中配置相同的 `ADC_MP_SOURCE_SECRET`。用 `openssl rand -hex 32` 生成，登记在各自部署环境。

微信真机和云环境需要各自的小程序账号及配置。网页部署和仓库中的自动化测试可独立运行。
