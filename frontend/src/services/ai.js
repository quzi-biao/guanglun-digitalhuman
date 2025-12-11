/**
 * AI 对话服务
 * 通过后端代理调用阿里云 DashScope API
 */

import { config } from '../config.js'

// 配置信息
const API_CONFIG = {
  proxyUrl: config.AI_PROXY_URL,
}

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一个友好、专业的数智人助手。你的职责是：

1. 以自然、亲切的方式与用户交流
2. 提供准确、有帮助的信息和建议
3. 保持礼貌和专业的态度
4. 用简洁明了的语言回答问题
5. 在必要时主动询问以更好地理解用户需求

请始终保持积极、耐心的态度，让用户感到舒适和被尊重。`

// 当前使用的系统提示词（可通过 setSystemPrompt 修改）
let SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT

/**
 * 设置自定义系统提示词
 * @param {string} prompt - 自定义的系统提示词
 */
export function setSystemPrompt(prompt) {
  SYSTEM_PROMPT = prompt || DEFAULT_SYSTEM_PROMPT
}

/**
 * 获取当前系统提示词
 * @returns {string} 当前的系统提示词
 */
export function getSystemPrompt() {
  return SYSTEM_PROMPT
}

/**
 * 重置为默认系统提示词
 */
export function resetSystemPrompt() {
  SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT
}

/**
 * 发送聊天消息
 * @param {Array} messages - 消息历史数组
 * @param {number} temperature - 温度参数
 * @returns {Promise<string>} AI 回复内容
 */
export async function sendChatMessage(messages, temperature = 0.7) {
  try {
    // 添加系统提示词
    const messagesWithSystem = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(({ role, content }) => ({ role, content }))
    ]

    const response = await fetch(API_CONFIG.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messagesWithSystem,
        temperature,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('AI 请求错误:', error)
    throw error
  }
}

/**
 * 发送流式聊天消息
 * @param {Array} messages - 消息历史数组
 * @param {Function} onChunk - 接收到数据块时的回调
 * @param {number} temperature - 温度参数
 * @returns {Promise<string>} 完整的 AI 回复内容
 */
export async function sendStreamingChatMessage(messages, onChunk, temperature = 0.7) {
  try {
    // 添加系统提示词
    const messagesWithSystem = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(({ role, content }) => ({ role, content }))
    ]

    const response = await fetch(API_CONFIG.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messagesWithSystem,
        temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    try {
      const processLines = () => {
        let lineEnd
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineEnd).trim()
          buffer = buffer.slice(lineEnd + 1)

          if (!line || !line.startsWith('data: ')) continue

          const data = line.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content
            if (content) {
              onChunk(content)
              fullText += content
            }
          } catch (e) {
            // 无法解析的行，忽略
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        processLines()
      }

      if (buffer.trim()) {
        buffer += '\n'
        processLines()
      }
    } finally {
      reader.cancel()
    }

    return fullText
  } catch (error) {
    console.error('AI 流式请求错误:', error)
    throw error
  }
}
