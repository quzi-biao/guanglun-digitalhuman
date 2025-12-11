/**
 * 阿里云 NLS Token 管理
 * 通过 AccessKey 获取 NLS Token
 */

import { createRequire } from 'module'
import dotenv from 'dotenv'

const require = createRequire(import.meta.url)
const RPCClient = require('@alicloud/pop-core').RPCClient

dotenv.config()

// Token 缓存
let cachedToken = null
let tokenExpireTime = 0

/**
 * 获取 NLS Token（使用官方 SDK）
 * 文档：https://help.aliyun.com/document_detail/450514.html
 */
export async function getNLSToken() {
  // 如果有缓存且未过期，直接返回
  const now = Date.now()
  if (cachedToken && tokenExpireTime > now) {
    console.log('使用缓存的 NLS Token')
    return cachedToken
  }

  const accessKeyId = process.env.VITE_ALIYUN_ACCESS_KEY_ID
  const accessKeySecret = process.env.VITE_ALIYUN_ACCESS_KEY_SECRET

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('未配置阿里云 AccessKey，请在 .env 中设置 VITE_ALIYUN_ACCESS_KEY_ID 和 VITE_ALIYUN_ACCESS_KEY_SECRET')
  }

  try {
    console.log('正在获取 NLS Token...')
    
    // 使用阿里云官方 SDK
    const client = new RPCClient({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
      apiVersion: '2019-02-28'
    })

    const result = await client.request('CreateToken', {}, { method: 'POST' })
    
    if (result.Token && result.Token.Id) {
      cachedToken = result.Token.Id
      // Token 有效期，提前 1 小时刷新
      const expireTime = result.Token.ExpireTime || 86400 // 默认 24 小时
      tokenExpireTime = now + expireTime * 1000 - 3600 * 1000
      console.log('✓ NLS Token 获取成功，有效期:', expireTime, '秒')
      return cachedToken
    } else {
      throw new Error('Token 响应格式错误: ' + JSON.stringify(result))
    }
  } catch (error) {
    console.error('✗ 获取 NLS Token 失败:', error.message || error)
    throw error
  }
}

/**
 * 简化方案：直接使用 DashScope API Key 作为 Token
 * 注意：这可能不是官方推荐的方式，但在某些场景下可以工作
 */
export function getSimpleToken() {
  const apiKey = process.env.VITE_DASHSCOPE_API_KEY
  if (!apiKey) {
    throw new Error('未配置 VITE_DASHSCOPE_API_KEY')
  }
  return apiKey
}

export default {
  getNLSToken,
  getSimpleToken
}
