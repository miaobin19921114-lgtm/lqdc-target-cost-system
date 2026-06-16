# 阿里云 ECS Docker Compose 部署说明

本项目不依赖 Railway，可直接在阿里云 ECS 或普通 Linux 服务器用 Docker Compose 运行。

## 1. 必备文件

- `Dockerfile`
- `docker-compose.yml`
- `.env`：服务器本地创建，不建议提交到 Git
- `.env.example`：环境变量示例
- `scripts/docker-entrypoint.sh`：容器启动脚本

## 2. 环境变量

服务器上执行：

```bash
cp .env.example .env
nano .env
```

重点修改：

```bash
DATABASE_URL=postgresql://用户名:数据库口令@db:5432/数据库名?schema=public
POSTGRES_DB=数据库名
POSTGRES_USER=用户名
POSTGRES_PASSWORD=数据库口令
ADMIN_EMAIL=管理员邮箱
ADMIN_PASSWORD=管理员初始口令
SESSION_SECRET=随机长字符串
UPLOAD_DIR=/app/storage/uploads
UPLOAD_DIR_ON_HOST=./storage/uploads
```

说明：

- `DATABASE_URL` 是应用连接数据库的唯一入口。
- Docker Compose 内置数据库服务名是 `db`，所以容器内连接地址使用 `@db:5432`。
- 文件上传容器路径：`UPLOAD_DIR=/app/storage/uploads`。
- 文件上传宿主机路径：`UPLOAD_DIR_ON_HOST=./storage/uploads`，生产环境可改成挂载数据盘路径。

## 3. 启动

```bash
mkdir -p storage/uploads
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f app
```

停止：

```bash
docker compose down
```

停止并删除数据库卷：

```bash
docker compose down -v
```

## 4. 端口

默认访问：

```bash
http://服务器公网IP:3000
```

可在 `.env` 修改：

```bash
APP_PORT=3000
PORT=3000
```

## 5. 数据库迁移和初始化

容器启动时会自动执行：

```bash
npx prisma migrate deploy
```

如果 `.env` 中 `RUN_SEED=true`，会尝试执行：

```bash
npm run db:seed
```

用于初始化管理员和基础科目。

## 6. 文件上传路径

当前约定：

```bash
容器内：/app/storage/uploads
宿主机：./storage/uploads
```

生产环境建议将 `UPLOAD_DIR_ON_HOST` 指向阿里云数据盘目录，例如：

```bash
UPLOAD_DIR_ON_HOST=/data/lqdc/uploads
```

然后执行：

```bash
mkdir -p /data/lqdc/uploads
```

## 7. 更新代码后重新部署

```bash
git pull
docker compose up -d --build
```

