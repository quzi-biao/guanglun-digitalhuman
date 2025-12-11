# 数智人对话系统

基于阿里云 AI 服务的智能对话系统，支持文本对话、语音合成和语音识别。

## 项目结构

```
digitalhuman/
├── backend/          # 后端服务（Node.js + Express）
├── frontend/         # 前端应用（Vue 3 + Vite）
├── ssl/              # SSL 证书
├── docker-compose.yml
├── deploy.sh
└── README.md
```

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Keys

# 2. 一键部署
./deploy.sh
```

访问: http://localhost

### 分别开发

#### 后端

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

#### 前端

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 功能特性

- ✅ AI 智能对话（阿里云 DashScope）
- ✅ 语音合成 TTS（阿里云 NLS）
- ✅ 实时语音识别 ASR（阿里云 NLS）
- ✅ Markdown 渲染
- ✅ 语音播放控制
- ✅ 历史消息管理
- ✅ HTTPS 支持
- ✅ Docker 部署

## 文档

- [Docker 部署指南](DOCKER_DEPLOYMENT.md)
- [HTTPS 配置指南](HTTPS_SETUP.md)
- [NLS 配置指南](NLS_SETUP.md)
- [后端 README](backend/README.md)
- [前端 README](frontend/README.md)

## 环境要求

- Node.js >= 18
- Docker & Docker Compose（可选）
- 阿里云 DashScope API Key
- 阿里云 NLS Appkey

## License

MIT
