# 龙泉地产目标成本测算系统

这是一个可线上部署的 Next.js + Prisma + PostgreSQL 基础项目。当前默认入口为 `/projects`，根路径 `/` 和旧入口 `/workspace` 会统一跳转到项目中心。

## 默认账号

- 账号：admin@lqdc.local
- 密码：admin123456

上线后请第一时间修改默认密码。

## 本地运行

```bash
npm install
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

访问：http://localhost:3000

## 生产构建与启动

```bash
npm run build
npm run start
```

项目声明 Node.js 版本为 `20.x`。生产环境需确保已配置 `DATABASE_URL`，否则 Prisma 无法连接数据库。

## Railway 线上部署

1. Railway 新建项目，选择 Deploy from GitHub Repo。
2. 添加 PostgreSQL。
3. 确认部署配置使用仓库内的 `railway.json` 和 `nixpacks.toml`。
4. 在 Web 服务 Variables 中添加必要环境变量：

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_EMAIL=admin@lqdc.local
ADMIN_PASSWORD=change_this_admin_password
ADMIN_NAME=系统管理员
SESSION_SECRET=change_this_to_a_long_random_string
UPLOAD_DIR=/app/storage/uploads
```

可选环境变量：

```env
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.example
ADMIN_PHONE=
WECHAT_APP_ID=
WECHAT_REDIRECT_URI=
```

Railway 会按当前配置执行：

```bash
npm install
npm run build
npm run railway:start
```

`npm run railway:start` 会读取平台注入的 `PORT`，并以 `0.0.0.0` 启动 Next.js，避免在 Railway 上出现端口解析问题。

## 当前已包含

- 登录页面
- 项目中心 `/projects`
- 项目测算中心 `/projects/[id]`
- 版本控制中心 `/projects/[id]/versions`
- 项目新增入口
- Excel 导入/导出入口占位
- Prisma schema
- seed 初始化管理员、示例项目、示例版本
- Dockerfile、docker-compose.yml、Railway 配置
- 基础计算函数和测试

## 后续开发重点

- 完整目标成本测算表
- 业态面积、收入、税金、分摊
- Excel 模板导入解析
- 按定稿模板导出 Excel
- 版本复制、锁定和对比
