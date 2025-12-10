# 数智人对话 H5 项目

基于 Vue3 + Vite 构建的数智人对话系统，支持 AI 对话和语音播报功能。

## 功能特性

- ✅ AI 智能对话（基于 OpenRouter API）
- ✅ Markdown 格式解析和渲染
- ✅ 阿里云通义千问 TTS 语音播报
- ✅ 透明玻璃态 UI 设计
- ✅ 自定义背景图片
- ⏳ 语音输入（待实现）
- ⏳ 他们在问（待实现）

## 技术栈

### 前端
- Vue 3 - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- Marked - Markdown 解析器
- Axios - HTTP 客户端

### 后端
- Express - Node.js Web 框架
- CORS - 跨域资源共享
- Dotenv - 环境变量管理

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 API Keys：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# OpenRouter API Key (获取地址: https://openrouter.ai/keys)
VITE_OPENROUTER_API_KEY=your-openrouter-api-key-here

# 阿里云 DashScope API Key (获取地址: https://help.aliyun.com/zh/model-studio/get-api-key)
VITE_DASHSCOPE_API_KEY=your-dashscope-api-key-here

# TTS 代理服务器地址（可选，默认为 http://localhost:3001/api/tts）
VITE_TTS_PROXY_URL=http://localhost:3001/api/tts

# 后端服务器端口（可选，默认为 3001）
PORT=3001
```

### 3. 启动开发服务器

**方式一：同时启动前后端（推荐）**

```bash
npm start
```

这将同时启动：
- 后端 TTS 代理服务器（端口 3001）
- 前端开发服务器（端口 5173）

**方式二：分别启动**

终端 1 - 启动后端服务器：
```bash
npm run server
```

终端 2 - 启动前端：
```bash
npm run dev
```

访问 http://localhost:5173

### 4. 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist` 目录。

## Docker 部署（推荐）

### 快速部署

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Keys

# 2. 一键部署
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问：
- 前端：http://localhost:8080
- 后端 API：http://localhost:8081

详细文档请查看 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

## 传统部署

**生产环境部署：**
1. 部署后端服务器：`node server.js`
2. 部署前端静态文件到 CDN 或静态服务器
3. 配置 `VITE_TTS_PROXY_URL` 指向生产环境的后端地址

## 项目结构

```
digitalhuman/
├── src/
│   ├── assets/              # 静态资源
│   │   └── WechatIMG377.jpg # 背景图片
│   ├── services/            # 服务层
│   │   ├── ai.js           # AI 对话服务
│   │   └── tts.js          # TTS 语音服务（前端）
│   ├── App.vue             # 主组件
│   ├── main.js             # 入口文件
│   └── style.css           # 全局样式
├── server.js               # 后端 TTS 代理服务器
├── index.html              # HTML 模板
├── vite.config.js          # Vite 配置
├── nginx.conf              # Nginx 配置
├── package.json            # 项目配置
├── Dockerfile.frontend     # 前端 Docker 镜像
├── Dockerfile.backend      # 后端 Docker 镜像
├── docker-compose.yml      # Docker Compose 配置
├── .dockerignore           # Docker 忽略文件
├── deploy.sh               # 一键部署脚本
├── .env                    # 环境变量（需自行创建）
├── .env.example            # 环境变量示例
├── README.md              # 项目说明
└── DOCKER_DEPLOYMENT.md   # Docker 部署文档
```

## API 配置

### OpenRouter API

支持多种 AI 模型：
- `anthropic/claude-sonnet-4` (默认)
- `openai/gpt-4o`
- `google/gemini-2.5-flash`
- 等等...

在 `src/services/ai.js` 中可以修改模型配置。

### 阿里云 TTS API

支持多种语音：
- Cherry (默认)
- Bella
- Andy
- Eric
- Emily
- Luna
- Stella
- Luca
- Lydia
- Aria

在 `src/services/tts.js` 中可以修改语音配置。

## 使用说明

1. 点击底部"键盘输入"按钮打开输入框
2. 输入问题后按回车或点击"发送"按钮
3. AI 会回复你的问题，并自动播报语音
4. 对话历史会保留在当前会话中

## 注意事项

- 需要稳定的网络连接访问 API
- TTS 播报需要浏览器支持 Audio API
- 建议在现代浏览器中使用（Chrome, Safari, Edge 等）
- **必须同时启动前端和后端服务器才能使用 TTS 功能**
- 后端服务器用于安全地调用阿里云 TTS API（避免在前端暴露 API Key）
- 生产环境部署时，需要将后端服务器部署到服务器上，并配置 CORS
- 小程序环境需要配置合法域名

## License

MIT
