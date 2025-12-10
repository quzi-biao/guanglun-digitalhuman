# 阿里云 NLS TTS 配置指南

## 1. 获取 NLS APPKEY

1. 访问 [阿里云智能语音交互控制台](https://nls-portal.console.aliyun.com/applist)
2. 创建项目或选择已有项目
3. 获取 APPKEY

## 2. 配置环境变量

在项目根目录创建 `.env` 文件（如果还没有的话）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```bash
# 阿里云 DashScope API Key（用于 AI 对话，也可作为 NLS Token）
VITE_DASHSCOPE_API_KEY=your-dashscope-api-key-here

# 阿里云 NLS APPKEY（用于 TTS 语音合成）
VITE_NLS_APPKEY=your-nls-appkey-here

# 后端服务器端口
PORT=3001
```

## 3. 启动服务

```bash
npm start
```

## 4. 测试

打开浏览器访问 `http://localhost:3000`，发送消息测试 AI 对话和 TTS 功能。

## 支持的 TTS 参数

- **voice**: 发音人（默认：xiaogang）
  - 可选值：xiaogang, xiaoyun 等
- **format**: 音频格式（默认：wav）
  - 可选值：wav, mp3, pcm
- **sampleRate**: 采样率（默认：24000）
  - 可选值：8000, 16000, 24000, 48000
- **pitchRate**: 语调（范围：-500~500，默认：0）
- **speechRate**: 语速（范围：-500~500，默认：0）

## 常见问题

### 1. 找不到 APPKEY？

确保你已经在 [NLS 控制台](https://nls-portal.console.aliyun.com/applist) 创建了项目。

### 2. TTS 合成失败？

- 检查 APPKEY 是否正确
- 检查 DashScope API Key 是否有效
- 查看后端日志获取详细错误信息

### 3. 音频无法播放？

- 检查浏览器控制台是否有错误
- 确认音频格式是否被浏览器支持（推荐使用 wav 格式）

## 参考文档

- [阿里云 NLS Node.js SDK](https://github.com/aliyun/alibabacloud-nls-nodejs-sdk)
- [语音合成 API 文档](https://help.aliyun.com/document_detail/84435.html)
