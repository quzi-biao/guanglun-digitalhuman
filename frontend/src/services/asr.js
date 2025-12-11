/**
 * 实时语音识别服务（客户端）
 * 使用 WebSocket 连接到后端 ASR 服务
 */

import { config } from '../config.js'

const WS_URL = config.ASR_WS_URL

class ASRService {
  constructor() {
    this.ws = null
    this.mediaRecorder = null
    this.audioContext = null
    this.isRecording = false
    this.callbacks = {}
  }

  /**
   * 连接到 ASR WebSocket 服务
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL)

        this.ws.onopen = () => {
          console.log('✓ ASR WebSocket 连接成功')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error)
          this.callbacks.onError?.(error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket 连接关闭')
          this.callbacks.onClose?.()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 处理来自服务器的消息
   */
  handleMessage(data) {
    switch (data.type) {
      case 'started':
        console.log('识别已开始')
        this.callbacks.onStarted?.()
        break
      case 'result':
        console.log('识别结果:', data.text, '是否最终:', data.isFinal)
        this.callbacks.onResult?.(data.text, data.isFinal)
        break
      case 'completed':
        console.log('识别完成')
        this.callbacks.onCompleted?.()
        break
      case 'error':
        console.error('识别错误:', data.message)
        this.callbacks.onError?.(data.message)
        break
      case 'closed':
        console.log('识别会话关闭')
        break
      default:
        console.warn('未知消息类型:', data.type)
    }
  }

  /**
   * 开始录音和识别
   */
  async startRecording(callbacks = {}) {
    this.callbacks = callbacks

    try {
      // 连接 WebSocket
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.connect()
      }

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      })

      const source = this.audioContext.createMediaStreamSource(stream)
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)

      source.connect(processor)
      processor.connect(this.audioContext.destination)

      // 发送开始识别命令
      this.ws.send(JSON.stringify({ type: 'start' }))

      // 处理音频数据
      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return

        const inputData = e.inputBuffer.getChannelData(0)
        
        // 转换为 PCM 16位
        const pcmData = this.convertToPCM16(inputData)
        
        // 发送音频数据
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const base64Audio = this.arrayBufferToBase64(pcmData)
          this.ws.send(JSON.stringify({ 
            type: 'audio', 
            audio: base64Audio 
          }))
        }
      }

      this.mediaRecorder = { stream, processor, source }
      this.isRecording = true

      console.log('✓ 开始录音和识别')
    } catch (error) {
      console.error('启动录音失败:', error)
      this.callbacks.onError?.(error)
      throw error
    }
  }

  /**
   * 停止录音和识别
   */
  stopRecording() {
    console.log('停止录音和识别')
    this.isRecording = false

    // 停止音频处理
    if (this.mediaRecorder) {
      if (this.mediaRecorder.processor) {
        this.mediaRecorder.processor.disconnect()
      }
      if (this.mediaRecorder.source) {
        this.mediaRecorder.source.disconnect()
      }
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
      }
      this.mediaRecorder = null
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // 发送停止命令
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }))
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.stopRecording()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 转换为 PCM 16位
   */
  convertToPCM16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)
    
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
    
    return buffer
  }

  /**
   * ArrayBuffer 转 Base64
   */
  arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}

// 导出单例
export const asrService = new ASRService()

/**
 * 开始语音识别
 * @param {Object} callbacks - 回调函数
 * @param {Function} callbacks.onResult - 识别结果回调
 * @param {Function} callbacks.onError - 错误回调
 * @param {Function} callbacks.onCompleted - 完成回调
 */
export async function startVoiceRecognition(callbacks) {
  return asrService.startRecording(callbacks)
}

/**
 * 停止语音识别
 */
export function stopVoiceRecognition() {
  asrService.stopRecording()
}
