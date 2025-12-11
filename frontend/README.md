# 数智人对话系统 - 前端应用

## 技术栈

- Vue 3
- Vite
- Marked (Markdown 渲染)

## 开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

访问: http://localhost:3000

## 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 部署

```bash
# 使用 Docker + Nginx
docker build -t digitalhuman-frontend .
docker run -p 80:80 digitalhuman-frontend
```
