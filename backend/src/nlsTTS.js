/**
 * 阿里云 NLS TTS 服务（基于官方 SDK）
 */

import { createRequire } from 'module'
import dotenv from 'dotenv'
import { getNLSToken, getSimpleToken } from './nlsToken.js'

const require = createRequire(import.meta.url)
const Nls = require('alibabacloud-nls')

dotenv.config()

// NLS 配置
const NLS_CONFIG = {
  url: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
  appkey: process.env.VITE_NLS_APPKEY
}

/**
 * 获取 Token
 */
async function getToken() {
  // 优先使用 AccessKey 获取正式 Token
  if (process.env.VITE_ALIYUN_ACCESS_KEY_ID && process.env.VITE_ALIYUN_ACCESS_KEY_SECRET) {
    return await getNLSToken()
  }
  
  // 降级方案：使用 DashScope API Key
  console.log('⚠️ 未配置 AccessKey，尝试使用 DashScope API Key 作为 Token')
  return getSimpleToken()
}

/**
 * 文本转语音
 * @param {string} text - 要合成的文本
 * @param {object} options - 配置选项
 * @returns {Promise<Buffer>} 音频数据
 */
export async function textToSpeechNLS(text, options = {}) {
  // 先获取 Token
  const token = await getToken()
  
  return new Promise((resolve, reject) => {
    const audioChunks = []
    
    const tts = new Nls.SpeechSynthesizer({
      url: NLS_CONFIG.url,
      appkey: NLS_CONFIG.appkey,
      token: token
    })

    // 监听元信息
    tts.on('meta', (msg) => {
      console.log('✓ TTS 元信息:', msg)
    })

    // 监听音频数据
    tts.on('data', (data) => {
      console.log(`接收音频数据: ${data.length} 字节`)
      audioChunks.push(data)
    })

    // 监听完成事件
    tts.on('completed', (msg) => {
      console.log('✓ TTS 合成完成:', msg)
      const audioBuffer = Buffer.concat(audioChunks)
      resolve(audioBuffer)
    })

    // 监听关闭事件
    tts.on('closed', () => {
      console.log('TTS 连接已关闭')
    })

    // 监听失败事件
    tts.on('failed', (msg) => {
      console.error('✗ TTS 合成失败:', msg)
      reject(new Error(msg.message || 'TTS 合成失败'))
    })

    // 设置合成参数
    const param = tts.defaultStartParams()
    param.text = text
    param.voice = options.voice || 'xiaogang'
    param.format = options.format || 'wav'
    param.sample_rate = options.sampleRate || 24000
    
    // 可选参数
    if (options.pitchRate !== undefined) {
      param.pitch_rate = options.pitchRate
    }
    if (options.speechRate !== undefined) {
      param.speech_rate = options.speechRate
    }
    if (options.enableSubtitle !== undefined) {
      param.enable_subtitle = options.enableSubtitle
    }

    console.log('开始 TTS 合成:', { text: text.substring(0, 50), voice: param.voice })

    // 开始合成
    tts.start(param, true, 6000).catch((error) => {
      console.error('✗ TTS 启动失败:', error)
      reject(error)
    })
  })
}

/**
 * 流式 TTS 类
 */
export class StreamingTTS {
  constructor(options = {}) {
    this.options = options
    this.tts = null
    this.onDataCallback = null
  }

  /**
   * 开始合成
   */
  async start(text) {
    // 先获取 Token
    const token = await getToken()
    
    return new Promise((resolve, reject) => {
      this.tts = new Nls.SpeechSynthesizer({
        url: NLS_CONFIG.url,
        appkey: NLS_CONFIG.appkey,
        token: token
      })

      this.tts.on('meta', (msg) => {
        console.log('✓ TTS 元信息:', msg)
      })

      this.tts.on('data', (data) => {
        if (this.onDataCallback) {
          this.onDataCallback(data)
        }
      })

      this.tts.on('completed', (msg) => {
        console.log('✓ TTS 合成完成')
        resolve()
      })

      this.tts.on('closed', () => {
        console.log('TTS 连接已关闭')
      })

      this.tts.on('failed', (msg) => {
        console.error('✗ TTS 合成失败:', msg)
        reject(new Error(msg.message || 'TTS 合成失败'))
      })

      const param = this.tts.defaultStartParams()
      param.text = text
      param.voice = this.options.voice || 'xiaogang'
      param.format = this.options.format || 'wav'
      param.sample_rate = this.options.sampleRate || 24000

      this.tts.start(param, true, 6000).catch(reject)
    })
  }

  /**
   * 监听音频数据
   */
  onData(callback) {
    this.onDataCallback = callback
  }

  /**
   * 停止合成
   */
  stop() {
    if (this.tts) {
      this.tts.shutdown()
      this.tts = null
    }
  }
}

export default {
  textToSpeechNLS,
  StreamingTTS
}
