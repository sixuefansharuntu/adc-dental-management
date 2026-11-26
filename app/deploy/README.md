# Docker Compose 部署课程演示

在具备 Docker Engine、Docker Compose、OpenSSL 和独立 HTTPS 地址的 Linux 主机上执行。从源码仓库进入 `app` 目录，以下命令以该目录为起点。首次部署会建立专用 PostgreSQL 容器和合成资料。

## 准备配置和证书

```sh
umask 077
ADC_PRIVATE="$HOME/adc-review-private"
install -d -m 700 "$ADC_PRIVATE" "$ADC_PRIVATE/secrets" "$ADC_PRIVATE/teacher-demo" \
  "$ADC_PRIVATE/certs" "$ADC_PRIVATE/acme-webroot" "$ADC_PRIVATE/backups"
cp -n deploy/server.env.example "$ADC_PRIVATE/server.env"
for secret in db_owner_password db_runtime_password; do
  if [ ! -e "$ADC_PRIVATE/secrets/$secret" ]; then
    openssl rand -hex 32 > "$ADC_PRIVATE/secrets/$secret"
    chmod 444 "$ADC_PRIVATE/secrets/$secret"
  fi
done
```

编辑 `server.env`，将 `PUBLIC_HOST` 设为自己的 HTTPS 域名或公网 IPv4，只填主机名或 IP。把五个目录变量改成上面创建的对应绝对路径。将该地址对应的 `fullchain.pem` 和 `privkey.pem` 放入 `TLS_DIRECTORY`。如果需要与课程在线站相同的公开角色选择，设 `ADC_COURSE_LOGIN_PUBLIC=true`，邀请摘要和截止时间均留空。

应用入口使用 80 和 443 端口，内部代理网段为 `172.30.44.0/28`。证书应覆盖 `PUBLIC_HOST`。两份数据库密钥文件需要让容器进程读取，宿主机目录通过权限限制访问。

## 首次启动

```sh
ADC_ENV="$HOME/adc-review-private/server.env"
docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher-init.json build teacher-init
docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher-init.json up -d --wait postgres
docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher-init.json run --rm teacher-init

docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher.json config --quiet
docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher.json build api web
docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher.json up -d --wait api web
```

初始化成功后，打开自己的 `https://主机名/` 查看员工端，`https://主机名/?view=patient` 查看患者端。开放快捷登录时可选演示患者、东城前台和东城医生。其它演示账号在 `COURSE_DEMO_DIRECTORY/environment/accounts.private.json` 生成；同目录的 `course-demo.json` 由 API 自动挂载。

初始排班以部署日期为起点生成。日常启动使用 `compose.teacher.json`，首次初始化仅适用于空的专用数据库集群。查看容器状态可用 `docker compose --env-file "$ADC_ENV" -f deploy/compose.teacher.json ps`。停止应用可用同一命令前缀执行 `stop`，数据保存在命名卷中。
