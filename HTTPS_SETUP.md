# HTTPS 配置指南

## 概述

本项目支持 HTTPS 部署，以便在移动设备上使用语音输入功能（浏览器要求麦克风访问必须使用 HTTPS）。

## 证书文件路径说明

### 本地开发
- 证书位置: `./ssl/key.pem` 和 `./ssl/cert.pem`
- `.env` 配置: 使用相对路径
  ```bash
  SSL_KEY_PATH=./ssl/key.pem
  SSL_CERT_PATH=./ssl/cert.pem
  ```

### Docker 部署
- 宿主机证书位置: `./ssl/key.pem` 和 `./ssl/cert.pem`
- 容器内映射路径:
  - 后端: `/app/ssl/key.pem` 和 `/app/ssl/cert.pem`
  - 前端: `/etc/nginx/ssl/key.pem` 和 `/etc/nginx/ssl/cert.pem`
- **注意**: Docker 部署时，`docker-compose.yml` 会自动覆盖环境变量，使用容器内的绝对路径

## 快速开始

### 1. 生成 SSL 证书

```bash
# 生成自签名证书（用于测试）
chmod +x generate-ssl-cert.sh
./generate-ssl-cert.sh

# 或者生成本地信任的证书（推荐，需要 mkcert）
chmod +x generate-trusted-cert.sh
./generate-trusted-cert.sh
```

### 2. 配置环境变量

编辑 `.env` 文件：

```bash
# 启用 HTTPS
USE_HTTPS=true

# 证书路径（本地开发和 Docker 都使用这个配置）
SSL_KEY_PATH=./ssl/key.pem
SSL_CERT_PATH=./ssl/cert.pem
```

### 3. 部署

#### 本地开发
```bash
# 前端
npm run dev

# 后端
npm start
```

访问: `https://localhost:3000`

#### Docker 部署
```bash
./deploy.sh
```

访问:
- HTTP: `http://localhost`
- HTTPS: `https://localhost`

## 证书文件结构

```
digitalhuman/
├── ssl/                    # 证书目录（已在 .gitignore 中）
│   ├── key.pem            # 私钥
│   └── cert.pem           # 证书
├── .env                   # 环境配置
└── docker-compose.yml     # Docker 配置
```

## Docker 卷挂载

`docker-compose.yml` 中的卷配置：

```yaml
backend:
  volumes:
    - ./ssl:/app/ssl:ro      # 只读挂载到后端容器

frontend:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro  # 只读挂载到前端容器
```

## 手机访问

1. 确保手机和电脑在同一网络
2. 查看电脑 IP 地址:
   ```bash
   ifconfig | grep 'inet '
   ```
3. 在手机浏览器访问: `https://YOUR_IP`
4. 接受证书警告（自签名证书）

## 故障排查

### 证书未找到错误

**错误**: `Error: ENOENT: no such file or directory, open './ssl/key.pem'`

**解决**:
1. 检查证书文件是否存在: `ls -la ssl/`
2. 重新生成证书: `./generate-ssl-cert.sh`
3. 确认 `.env` 中 `USE_HTTPS=true`

### Docker 容器内证书路径错误

**错误**: 容器日志显示证书路径错误

**解决**:
- Docker 部署时，`docker-compose.yml` 会自动设置正确的容器内路径
- 不需要修改 `.env` 文件
- 确保 `./ssl/` 目录存在且包含证书文件

### 浏览器证书警告

**原因**: 使用自签名证书

**解决方案**:
1. **临时**: 点击"高级" -> "继续访问"
2. **推荐**: 使用 `mkcert` 生成本地信任的证书
   ```bash
   ./generate-trusted-cert.sh
   ```

## 生产环境建议

1. 使用 Let's Encrypt 等 CA 签发的正式证书
2. 配置证书自动续期
3. 启用 HSTS (已在 nginx.conf 中配置)
4. 定期更新 SSL/TLS 配置
