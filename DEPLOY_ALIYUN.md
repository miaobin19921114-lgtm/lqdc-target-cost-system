# 阿里云 Docker Compose 部署说明

本项目已去掉 Railway 依赖，可直接在阿里云 ECS 或普通 Linux 服务器用 Docker Compose 运行。

## 1. 服务器要求

- Ubuntu / Debian / CentOS 均可
- 已安装 Docker 和 Docker Compose 插件
- 安全组开放应用端口，默认 `3000`

## 2. 准备环境变量

复制示例文件：

```bash
cp .env.example .env
```

修改 `.env`，重点检查：

```bash
DATABASE_URL=postgresql://lqdc_user:change_this_database_password@db:5432/lqdc_target_cost?schema=public
POSTGRES_DB=lqdc_target_cost
POSTGRES_USER=lqdc_user
POSTGRES_PASSWORD=change_this_database_password
SESSION_SECRET=change_this_to_a_long_random_string
APP_PORT=3000
PORT=3000
UPLOAD_DIR=/app/storage/uploads
UPLOAD_DIR_ON_HOST=./storage/uploads
```

说明：

- `DATABASE_URL` 必须使用环境变量，不写死在代码里。
- Docker Compose 内部数据库主机名固定为 `db`。
- 文件上传容器路径为 `UPLOAD_DIR`，默认 `/app/storage/uploads`。
- 服务器宿主机持久化路径为 `UPLOAD_DIR_ON_HOST`，默认 `./storage/uploads`。

## 3. 启动

```bash
docker compose up -d --build
```

首次启动时容器会自动执行：

```bash
prisma migrate deploy
```

## 4. 查看日志

```bash
docker compose logs -f app
```

## 5. 停止

```bash
docker compose down
```

保留数据库数据。若要连数据库卷也删除，才使用：

```bash
docker compose down -v
```

## 6. 健康检查

浏览器访问：

```text
http://服务器IP:3000/api/health
```

返回 `ok: true` 表示应用可访问。

## 7. 文件上传路径

当前约定：

```text
容器内：/app/storage/uploads
宿主机：./storage/uploads
```

如需改到阿里云数据盘，例如 `/data/lqdc/uploads`，修改 `.env`：

```bash
UPLOAD_DIR_ON_HOST=/data/lqdc/uploads
UPLOAD_DIR=/app/storage/uploads
```

并创建目录：

```bash
mkdir -p /data/lqdc/uploads
```

## 8. 更新部署

```bash
git pull
docker compose up -d --build
```

## 9. 关键文件

```text
Dockerfile
docker-compose.yml
.env.example
scripts/docker-entrypoint.sh
storage/uploads/.gitkeep
```

这些文件不依赖 Railway，可以迁移到阿里云 ECS、腾讯云、华为云等普通 Docker 环境。
