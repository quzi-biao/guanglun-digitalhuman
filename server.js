/**
 * TTS 后端代理服务器
 * 用于安全地调用阿里云 TTS API
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 配置信息
const TTS_CONFIG = {
  apiKey: process.env.VITE_DASHSCOPE_API_KEY,
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  model: 'qwen3-tts-flash',
  voice: 'Cherry',
  languageType: 'Chinese'
}

// 中间件
app.use(cors())
app.use(express.json())

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TTS Proxy Server is running' })
})

// TTS 代理接口
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice, languageType } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '文本内容为空' })
    }

    if (!TTS_CONFIG.apiKey || TTS_CONFIG.apiKey === 'your-dashscope-api-key-here') {
      return res.status(500).json({ error: 'API Key 未配置' })
    }

    // 调用阿里云 TTS API
    const response = await fetch(TTS_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TTS_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable'
      },
      body: JSON.stringify({
        model: TTS_CONFIG.model,
        input: {
          text: text.trim(),
          voice: voice || TTS_CONFIG.voice,
          language_type: languageType || TTS_CONFIG.languageType
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS API 错误:', errorText)
      return res.status(response.status).json({ 
        error: `TTS request failed: ${response.status} ${response.statusText}`,
        details: errorText
      })
    }

    // 处理 SSE 流式响应
    const responseText = await response.text()
    
    // 解析 SSE 格式数据
    let audioUrl = null
    const lines = responseText.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const jsonStr = line.substring(5).trim()
          if (jsonStr && jsonStr !== '[DONE]') {
            const data = JSON.parse(jsonStr)
            
            // 检查是否有错误
            if (data.code) {
              return res.status(400).json({ 
                error: `TTS API 返回错误: ${data.message}`,
                code: data.code
              })
            }
            
            // 提取音频 URL
            if (data.output?.audio?.url) {
              audioUrl = data.output.audio.url
              break
            }
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e, line)
        }
      }
    }

    if (!audioUrl) {
      console.error('未找到音频 URL，响应内容:', responseText)
      return res.status(500).json({ error: '未获取到音频 URL' })
    }

    // 返回音频 URL
    res.json({ audioUrl })
  } catch (error) {
    console.error('TTS 转换错误:', error)
    res.status(500).json({ 
      error: 'TTS 转换失败',
      message: error.message 
    })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`TTS Proxy Server running on http://localhost:${PORT}`)
  console.log(`API Key configured: ${TTS_CONFIG.apiKey ? '✓' : '✗'}`)
})
