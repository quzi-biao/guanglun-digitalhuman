# 数智人对话系统 - 后端服务

## 功能

- AI 对话代理（阿里云 DashScope）
- 语音合成 TTS（阿里云 NLS）
- 语音识别 ASR（阿里云 NLS）
- WebSocket 实时通信

## 开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Keys

# 启动开发服务器
npm run dev
```

## 部署

```bash
# 使用 Docker
docker build -t digitalhuman-backend .
docker run -p 3001:3001 --env-file .env digitalhuman-backend
```

## API 端点

- `POST /api/chat` - AI 对话
- `POST /api/tts` - 文本转语音
- `WS /ws/asr` - 实时语音识别
- `GET /health` - 健康检查
