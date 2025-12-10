/**
 * 后端代理服务器
 * 用于安全地调用阿里云 DashScope API（AI 对话 + TTS）
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { readFileSync } from 'fs'
import { WebSocketServer } from 'ws'
import { textToSpeechNLS } from './nlsTTS.js'
import { createSpeechTranscription, getDefaultParams } from './nlsASR.js'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const USE_HTTPS = process.env.USE_HTTPS === 'true'

// 创建服务器（HTTP 或 HTTPS）
let server
if (USE_HTTPS) {
  try {
    const httpsOptions = {
      key: readFileSync(process.env.SSL_KEY_PATH || './ssl/key.pem'),
      cert: readFileSync(process.env.SSL_CERT_PATH || './ssl/cert.pem')
    }
    server = createHttpsServer(httpsOptions, app)
    console.log('✓ HTTPS 服务器已启用')
  } catch (error) {
    console.error('✗ 加载 SSL 证书失败，回退到 HTTP:', error.message)
    server = createServer(app)
  }
} else {
  server = createServer(app)
}

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

// 创建 WebSocket 服务器用于实时语音识别
const wss = new WebSocketServer({ server, path: '/ws/asr' })

wss.on('connection', (ws) => {
  console.log('🎤 新的 ASR WebSocket 连接')
  let st = null
  let isRecognizing = false
  let isNlsReady = false
  let audioQueue = []
  let lastStartTime = 0
  const MIN_START_INTERVAL = 2000 // 最小启动间隔 2 秒

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString())

      if (data.type === 'start') {
        // 检查请求频率
        const now = Date.now()
        if (now - lastStartTime < MIN_START_INTERVAL) {
          console.log('请求过于频繁，请稍后再试')
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: '请求过于频繁，请稍后再试' 
          }))
          return
        }
        lastStartTime = now
        
        // 开始识别
        console.log('开始语音识别...')
        isRecognizing = true
        isNlsReady = false
        audioQueue = []

        try {
          st = await createSpeechTranscription({
            onStarted: (msg) => {
              console.log('NLS 连接已建立，可以发送音频')
              isNlsReady = true
              ws.send(JSON.stringify({ type: 'started', data: msg }))
              
              // 发送队列中的音频数据
              if (audioQueue.length > 0) {
                console.log(`发送队列中的 ${audioQueue.length} 个音频包`)
                audioQueue.forEach(buffer => {
                  st.sendAudio(buffer)
                })
                audioQueue = []
              }
            },
            onChanged: (msg) => {
              // 发送中间结果
              try {
                const result = JSON.parse(msg)
                if (result.payload && result.payload.result) {
                  ws.send(JSON.stringify({ 
                    type: 'result', 
                    text: result.payload.result,
                    isFinal: false 
                  }))
                }
              } catch (e) {
                console.error('解析中间结果失败:', e)
              }
            },
            onCompleted: (msg) => {
              // 发送最终结果
              try {
                const result = JSON.parse(msg)
                if (result.payload && result.payload.result) {
                  ws.send(JSON.stringify({ 
                    type: 'result', 
                    text: result.payload.result,
                    isFinal: true 
                  }))
                }
              } catch (e) {
                console.error('解析最终结果失败:', e)
              }
              ws.send(JSON.stringify({ type: 'completed' }))
              isRecognizing = false
            },
            onFailed: (msg) => {
              ws.send(JSON.stringify({ type: 'error', message: msg }))
              isRecognizing = false
            },
            onClosed: () => {
              ws.send(JSON.stringify({ type: 'closed' }))
              isRecognizing = false
            }
          })

          await st.start(getDefaultParams(), true, 6000)
        } catch (error) {
          console.error('启动识别失败:', error)
          ws.send(JSON.stringify({ type: 'error', message: error.message }))
          isRecognizing = false
        }
      } else if (data.type === 'audio') {
        // 发送音频数据
        if (st && isRecognizing) {
          const audioBuffer = Buffer.from(data.audio, 'base64')
          
          if (isNlsReady) {
            // NLS 已就绪，直接发送
            st.sendAudio(audioBuffer)
          } else {
            // NLS 未就绪，加入队列
            audioQueue.push(audioBuffer)
          }
        }
      } else if (data.type === 'stop') {
        // 停止识别
        console.log('停止语音识别...')
        if (st && isRecognizing) {
          try {
            await st.close()
          } catch (error) {
            console.error('关闭识别失败:', error)
          }
          isRecognizing = false
        }
      }
    } catch (error) {
      console.error('处理消息失败:', error)
      ws.send(JSON.stringify({ type: 'error', message: error.message }))
    }
  })

  ws.on('close', () => {
    console.log('🎤 ASR WebSocket 连接关闭')
    if (st && isRecognizing) {
      try {
        st.shutdown()
      } catch (error) {
        console.error('强制关闭识别失败:', error)
      }
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error)
  })
})

// 启动服务器
server.listen(PORT, () => {
  console.log('\n========================================')
  console.log('🚀 后端代理服务器已启动')
  console.log('========================================')
  console.log(`📍 HTTP 地址: http://localhost:${PORT}`)
  console.log(`📍 WebSocket 地址: ws://localhost:${PORT}/ws/asr`)
  console.log(`🔑 API Key: ${API_KEY ? '✓ 已配置' : '✗ 未配置'}`)
  console.log(`\n📡 可用接口:`)
  console.log(`  - POST /api/chat (AI 对话)`)
  console.log(`  - POST /api/tts (TTS 语音合成 - NLS SDK)`)
  console.log(`  - WS /ws/asr (实时语音识别)`)
  console.log(`  - GET /health (健康检查)`)
  console.log('========================================\n')
})
