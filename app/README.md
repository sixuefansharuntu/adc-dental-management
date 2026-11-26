# ADC 源码与部署测试

本目录包含 Vue 网页、NestJS API、PostgreSQL 迁移、微信小程序及云函数。网页和 API 包含课程演示站的账号选择和快捷登录。

## 本地运行

安装 Node.js 24 后，在本目录执行以下命令。首次初始化会创建独立的本机 PostgreSQL 数据目录，并生成合成诊所、账号和示例排班。

```sh
git clone https://github.com/sixuefansharuntu/adc-dental-management.git
cd adc-dental-management/app
npm ci
npm run db:init
npm run dev
```

- [本机患者预约页](http://127.0.0.1:5173/?view=patient)
- [本机员工工作台](http://127.0.0.1:5173/)
- 本地示例账号在 `app/.runtime/` 内生成，公开预约查询可以直接使用。

再次启动时运行 `npm run dev`。按 `Ctrl+C` 停止开发服务，再运行 `npm run db:stop` 可停止本目录的数据库。

安装依赖后，`npm run build` 构建网页和 API，`npm test` 运行自动化测试。初始化本地合成环境后，可运行 `npm run verify:teacher-demo` 在独立测试集群核对课程登录、预约和接诊接口。

## 独立部署

- [Linux 与 Docker Compose 部署](deploy/README.md)说明如何在自己的服务器初始化独立数据库、配置 HTTPS 并启动网页和 API。
- [微信小程序和云函数配置](apps/miniprogram/README.md)说明导入、模拟器联调和连接自有后端的步骤。

在线教师演示的入口见[仓库首页](../README.md)。线上月度演示数据与本地初始化生成的样例相互独立。本地初始化后使用本机生成的账号。公开演示登录只在已启用该功能的专用课程部署中提供。
