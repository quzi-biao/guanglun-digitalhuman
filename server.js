/**
 * 后端代理服务器
 * 用于安全地调用阿里云 DashScope API（AI 对话 + TTS）
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { textToSpeechNLS } from './nlsTTS.js'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const server = createServer(app)

// API Key
const API_KEY = process.env.VITE_DASHSCOPE_API_KEY
console.log('环境变量 VITE_DASHSCOPE_API_KEY:', API_KEY ? `${API_KEY.substring(0, 10)}...` : '未设置')

// TTS 配置
const TTS_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  model: 'qwen3-tts-flash',
  voice: 'xiaogang',
  languageType: 'Chinese'
}

// AI 对话配置
const AI_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen-plus'
}

// 中间件
app.use(cors())
app.use(express.json())

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TTS Proxy Server is running' })
})

// TTS 代理接口（使用 NLS SDK）
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice, format, sampleRate } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '文本内容为空' })
    }

    if (!API_KEY || API_KEY === 'your-dashscope-api-key-here') {
      return res.status(500).json({ error: 'API Key 未配置' })
    }

    console.log('开始 TTS 合成:', { text: text.substring(0, 50), voice: voice || 'xiaogang' })

    // 使用 NLS SDK 进行语音合成
    const audioBuffer = await textToSpeechNLS(text.trim(), {
      voice: voice || 'xiaogang',
      format: format || 'wav',
      sampleRate: sampleRate || 24000
    })

    // 将音频数据转换为 base64
    const audioBase64 = audioBuffer.toString('base64')
    const audioDataUrl = `data:audio/${format || 'wav'};base64,${audioBase64}`

    console.log('✓ TTS 合成完成，音频大小:', audioBuffer.length, '字节')

    // 返回音频数据 URL
    res.json({ audioUrl: audioDataUrl })
  } catch (error) {
    console.error('✗ TTS 转换错误:', error)
    res.status(500).json({ 
      error: 'TTS 转换失败',
      message: error.message 
    })
  }
})

// AI 对话代理接口
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, temperature = 0.7, stream = false } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '消息列表为空或格式错误' })
    }

    if (!API_KEY || API_KEY === 'your-dashscope-api-key-here') {
      return res.status(500).json({ error: 'API Key 未配置' })
    }

    // 验证 API Key 格式
    if (!API_KEY.startsWith('sk-')) {
      console.error('API Key 格式错误，应该以 sk- 开头，当前:', API_KEY.substring(0, 15))
      return res.status(500).json({ 
        error: 'API Key 格式错误',
        details: 'DashScope API Key 应该以 sk- 开头'
      })
    }

    const requestBody = {
      model: AI_CONFIG.model,
      messages,
      temperature
    }

    // 只有在需要流式响应时才添加 stream 参数
    if (stream) {
      requestBody.stream = true
    }

    console.log('AI API 请求:', {
      url: AI_CONFIG.baseUrl,
      model: AI_CONFIG.model,
      messageCount: messages.length,
      stream,
      apiKeyPrefix: API_KEY ? API_KEY.substring(0, 10) + '...' : '未设置'
    })

    // 调用阿里云 AI API
    const response = await fetch(AI_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API 错误:', errorText)
      return res.status(response.status).json({ 
        error: `AI request failed: ${response.status} ${response.statusText}`,
        details: errorText
      })
    }

    // 如果是流式响应，直接转发流
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      response.body.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk)
        },
        close() {
          res.end()
        },
        abort(err) {
          console.error('Stream error:', err)
          res.end()
        }
      }))
    } else {
      // 非流式响应，直接返回 JSON
      const data = await response.json()
      res.json(data)
    }
  } catch (error) {
    console.error('AI 对话错误:', error)
    res.status(500).json({ 
      error: 'AI 对话失败',
      message: error.message 
    })
  }
})

// 启动服务器
server.listen(PORT, () => {
  console.log('\n========================================')
  console.log('🚀 后端代理服务器已启动')
  console.log('========================================')
  console.log(`📍 HTTP 地址: http://localhost:${PORT}`)
  console.log(`🔑 API Key: ${API_KEY ? '✓ 已配置' : '✗ 未配置'}`)
  console.log(`\n📡 可用接口:`)
  console.log(`  - POST /api/chat (AI 对话)`)
  console.log(`  - POST /api/tts (TTS 语音合成 - NLS SDK)`)
  console.log(`  - GET /health (健康检查)`)
  console.log('========================================\n')
})
