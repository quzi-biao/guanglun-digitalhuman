# Docker 部署文档

## 概述

本项目提供完整的 Docker 部署方案，包括前端和后端服务的容器化部署。

## 架构说明

- **前端服务**: Vue 3 应用，使用 Nginx 提供静态文件服务（宿主机端口 80 → 容器端口 80）
- **后端服务**: Node.js Express TTS 代理服务（宿主机端口 8089 → 容器端口 3001）
- **网络**: 两个服务通过 Docker 内部网络通信

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 已配置的 API Keys

## 快速开始

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Keys
vim .env
```

必需配置：
- `VITE_DASHSCOPE_API_KEY`: 阿里云 DashScope API Key（TTS 功能）
- `VITE_OPENROUTER_API_KEY`: OpenRouter API Key（AI 对话功能）

### 2. 一键部署

```bash
# 赋予执行权限
chmod +x deploy.sh

# 执行部署脚本
./deploy.sh
```

部署脚本会自动：
- 检查环境变量配置
- 停止旧容器
- 构建新镜像
- 启动服务
- 执行健康检查

### 3. 访问应用

- **前端**: http://localhost
- **后端 API**: http://localhost:8089
- **后端健康检查**: http://localhost:8089/health

## 手动部署

### 构建镜像

```bash
# 构建所有服务
docker-compose build

# 仅构建前端
docker-compose build frontend

# 仅构建后端
docker-compose build backend
```

### 启动服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 启动所有服务（前台运行，查看日志）
docker-compose up

# 启动指定服务
docker-compose up -d backend
docker-compose up -d frontend
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 停止指定服务
docker-compose stop backend
docker-compose stop frontend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启指定服务
docker-compose restart backend
docker-compose restart frontend
```

## 日志管理

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看指定服务日志
docker-compose logs backend
docker-compose logs frontend

# 查看最近 100 行日志
docker-compose logs --tail=100
```

### 清理日志

```bash
# 清理容器日志
docker-compose down
docker system prune -a
```

## 健康检查

### 自动健康检查

Docker Compose 配置了自动健康检查：
- **后端**: 每 30 秒检查 `/health` 端点
- **前端**: 每 30 秒检查根路径

### 手动健康检查

```bash
# 检查后端健康
curl http://localhost:8089/health

# 检查前端健康
curl http://localhost/health

# 查看容器健康状态
docker-compose ps
```

## 生产环境部署

### 1. 修改端口映射

编辑 `docker-compose.yml`：

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # 修改为你需要的端口
  
  backend:
    ports:
      - "3001:3001"
```

### 2. 配置域名

如果使用域名访问，需要：

1. 配置反向代理（Nginx/Caddy）
2. 设置 SSL 证书
3. 更新前端环境变量中的后端 URL

示例 Nginx 配置：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8089/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 环境变量管理

生产环境建议：
- 使用 Docker Secrets 或环境变量管理工具
- 不要将 `.env` 文件提交到版本控制
- 定期轮换 API Keys

### 4. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

## 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker-compose logs

# 查看容器状态
docker-compose ps

# 进入容器调试
docker-compose exec backend sh
docker-compose exec frontend sh
```

### 网络问题

```bash
# 检查网络
docker network ls
docker network inspect digitalhuman-network

# 重建网络
docker-compose down
docker network prune
docker-compose up -d
```

### 端口冲突

如果端口被占用：

```bash
# 查看端口占用
lsof -i :80
lsof -i :8089

# 修改 docker-compose.yml 中的端口映射
```

### 构建失败

```bash
# 清理缓存重新构建
docker-compose build --no-cache

# 清理所有未使用的镜像
docker system prune -a
```

## 更新部署

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新部署
./deploy.sh
```

### 仅更新前端

```bash
docker-compose build frontend
docker-compose up -d frontend
```

### 仅更新后端

```bash
docker-compose build backend
docker-compose up -d backend
```

## 备份与恢复

### 备份配置

```bash
# 备份环境变量
cp .env .env.backup

# 导出镜像
docker save digitalhuman-frontend:latest > frontend.tar
docker save digitalhuman-backend:latest > backend.tar
```

### 恢复

```bash
# 恢复环境变量
cp .env.backup .env

# 导入镜像
docker load < frontend.tar
docker load < backend.tar

# 启动服务
docker-compose up -d
```

## 监控

### 资源使用

```bash
# 查看容器资源使用
docker stats

# 查看指定容器
docker stats digitalhuman-frontend digitalhuman-backend
```

### 容器信息

```bash
# 查看容器详细信息
docker inspect digitalhuman-frontend
docker inspect digitalhuman-backend
```

## 安全建议

1. **API Keys 安全**
   - 不要在代码中硬编码 API Keys
   - 使用环境变量或 Docker Secrets
   - 定期轮换密钥

2. **网络安全**
   - 使用 HTTPS
   - 配置防火墙规则
   - 限制容器间通信

3. **镜像安全**
   - 使用官方基础镜像
   - 定期更新镜像
   - 扫描漏洞

4. **访问控制**
   - 配置反向代理
   - 添加认证机制
   - 限制 API 访问频率

## 性能优化

1. **前端优化**
   - 启用 Gzip 压缩（已配置）
   - 配置静态资源缓存（已配置）
   - 使用 CDN

2. **后端优化**
   - 增加 Node.js 内存限制
   - 使用进程管理器（PM2）
   - 配置负载均衡

3. **Docker 优化**
   - 使用多阶段构建（已实现）
   - 优化镜像层
   - 使用 .dockerignore

## 常见问题

**Q: 如何修改端口？**  
A: 编辑 `docker-compose.yml` 中的 `ports` 配置。

**Q: 如何查看实时日志？**  
A: 运行 `docker-compose logs -f`

**Q: 如何完全清理？**  
A: 运行 `docker-compose down -v && docker system prune -a`

**Q: 前端无法连接后端？**  
A: 检查 `VITE_TTS_PROXY_URL` 环境变量配置。

**Q: 如何扩展后端服务？**  
A: 使用 `docker-compose up -d --scale backend=3`

## 支持

如有问题，请查看：
- 项目 README.md
- Docker 日志
- GitHub Issues
