// API 配置管理

// 获取基础 URL，优先使用环境变量，否则使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// 自动判断 WebSocket 协议
const WS_PROTOCOL = API_BASE_URL.startsWith('https') ? 'wss' : 'ws'
const WS_BASE_URL = API_BASE_URL.replace(/^https?/, WS_PROTOCOL)

// 导出配置
export const config = {
  // HTTP API 端点
  AI_PROXY_URL: `${API_BASE_URL}/api/chat`,
  TTS_PROXY_URL: `${API_BASE_URL}/api/tts`,
  
  // WebSocket 端点
  ASR_WS_URL: `${WS_BASE_URL}/ws/asr`,
  
  // 基础 URL（用于其他需要的地方）
  API_BASE_URL,
  WS_BASE_URL
}

// 开发环境下打印配置
if (import.meta.env.DEV) {
  console.log('API 配置:', config)
}
