/**
 * 阿里云 NLS 实时语音识别服务
 * 使用 alibabacloud-nls SDK 进行实时语音识别
 */

import { SpeechTranscription } from 'alibabacloud-nls'
import dotenv from 'dotenv'
import { getNLSToken, getSimpleToken } from './nlsToken.js'

dotenv.config()

const NLS_CONFIG = {
  url: 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1',
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
 * 创建实时语音识别实例
 * @param {Object} callbacks - 回调函数集合
 * @param {Function} callbacks.onStarted - 识别开始回调
 * @param {Function} callbacks.onChanged - 中间结果回调
 * @param {Function} callbacks.onCompleted - 识别完成回调
 * @param {Function} callbacks.onFailed - 识别失败回调
 * @param {Function} callbacks.onClosed - 连接关闭回调
 * @returns {Promise<Object>} 语音识别实例
 */
export async function createSpeechTranscription(callbacks = {}) {
  if (!NLS_CONFIG.appkey) {
    throw new Error('NLS Appkey 未配置，请在 .env 文件中设置 VITE_NLS_APPKEY')
  }

  // 获取 Token
  const token = await getToken()

  const st = new SpeechTranscription({
    url: NLS_CONFIG.url,
    appkey: NLS_CONFIG.appkey,
    token: token
  })

  // 注册事件回调
  st.on('started', (msg) => {
    console.log('ASR Started:', msg)
    callbacks.onStarted?.(msg)
  })

  st.on('changed', (msg) => {
    console.log('ASR Changed:', msg)
    callbacks.onChanged?.(msg)
  })

  st.on('completed', (msg) => {
    console.log('ASR Completed:', msg)
    callbacks.onCompleted?.(msg)
  })

  st.on('closed', () => {
    console.log('ASR Closed')
    callbacks.onClosed?.()
  })

  st.on('failed', (msg) => {
    console.error('ASR Failed:', msg)
    callbacks.onFailed?.(msg)
  })

  st.on('begin', (msg) => {
    console.log('ASR Sentence Begin:', msg)
  })

  st.on('end', (msg) => {
    console.log('ASR Sentence End:', msg)
  })

  return st
}

/**
 * 获取默认的识别参数
 * @returns {Object} 默认参数
 */
export function getDefaultParams() {
  return {
    format: 'pcm',
    sample_rate: 16000,
    enable_intermediate_result: true,
    enable_punctuation_prediction: true,
    enable_inverse_text_normalization: true
  }
}
