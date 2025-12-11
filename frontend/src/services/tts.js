/**
 * 阿里云 TTS 服务
 * 使用通义千问 TTS API（通过后端代理）
 */

// 配置信息
const TTS_CONFIG = {
  proxyUrl: import.meta.env.VITE_TTS_PROXY_URL || 'http://localhost:3001/api/tts',
  voice: 'xiaogang', 
  languageType: 'Chinese'
}

/**
 * 文本转语音
 * @param {string} text - 要转换的文本
 * @returns {Promise<string>} 音频文件 URL
 */
export async function textToSpeech(text) {
  try {
    // 清理 Markdown 标记，只保留纯文本
    const cleanText = cleanMarkdown(text)
    
    if (!cleanText.trim()) {
      throw new Error('文本内容为空')
    }

    // 调用后端代理
    const response = await fetch(TTS_CONFIG.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanText,
        voice: TTS_CONFIG.voice,
        languageType: TTS_CONFIG.languageType
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('TTS 代理错误:', errorData)
      throw new Error(errorData.error || `TTS request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.audioUrl) {
      throw new Error('未获取到音频 URL')
    }

    return data.audioUrl
  } catch (error) {
    console.error('TTS 转换错误:', error)
    throw error
  }
}

/**
 * 播放音频
 * @param {string} audioUrl - 音频文件 URL
 * @returns {Promise<void>}
 */
export async function playAudio(audioUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl)
    
    audio.onended = () => {
      resolve()
    }
    
    audio.onerror = (error) => {
      console.error('音频播放错误:', error)
      reject(error)
    }
    
    audio.play().catch(error => {
      console.error('音频播放失败:', error)
      reject(error)
    })
  })
}

/**
 * 清理 Markdown 标记，提取纯文本
 * @param {string} markdown - Markdown 文本
 * @returns {string} 纯文本
 */
function cleanMarkdown(markdown) {
  let text = markdown
  
  // 移除代码块
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/`[^`]+`/g, '')
  
  // 移除链接，保留文本
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  
  // 移除图片
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
  
  // 移除标题标记
  text = text.replace(/^#{1,6}\s+/gm, '')
  
  // 移除粗体和斜体标记
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')
  
  // 移除列表标记
  text = text.replace(/^[\*\-\+]\s+/gm, '')
  text = text.replace(/^\d+\.\s+/gm, '')
  
  // 移除引用标记
  text = text.replace(/^>\s+/gm, '')
  
  // 移除水平线
  text = text.replace(/^[\*\-_]{3,}$/gm, '')
  
  // 清理多余的空白
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()
  
  return text
}

/**
 * 停止当前播放的音频
 */
let currentAudio = null

export function stopAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

/**
 * 播放音频（支持停止当前播放）
 * @param {string} audioUrl - 音频文件 URL
 * @param {Function} onComplete - 播放完成回调
 * @returns {Promise<void>}
 */
export async function playAudioWithControl(audioUrl, onComplete) {
  // 停止当前播放
  stopAudio()
  
  return new Promise((resolve, reject) => {
    currentAudio = new Audio(audioUrl)
    
    currentAudio.onended = () => {
      currentAudio = null
      if (onComplete) {
        onComplete()
      }
      resolve()
    }
    
    currentAudio.onerror = (error) => {
      console.error('音频播放错误:', error)
      currentAudio = null
      if (onComplete) {
        onComplete()
      }
      reject(error)
    }
    
    currentAudio.play().catch(error => {
      console.error('音频播放失败:', error)
      currentAudio = null
      if (onComplete) {
        onComplete()
      }
      reject(error)
    })
  })
}
