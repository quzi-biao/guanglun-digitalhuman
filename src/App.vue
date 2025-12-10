<template>
  <div class="app-container" @click="handleContainerClick">
    <!-- 背景图片 -->
    <div class="background"></div>
    
    <!-- 右上角按钮组 -->
    <div class="top-buttons">
      <!-- 停止播报按钮（仅在播放时显示） -->
      <button v-if="isPlaying" @click.stop="stopPlayback" class="stop-play-btn" title="停止播报">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      </button>
      
      <!-- 历史按钮 -->
      <button @click.stop="showHistory = !showHistory" class="history-btn" :title="showHistory ? '关闭历史' : '查看历史'">
        <svg v-if="!showHistory" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3z"></path>
          <path d="M9 9h6M9 12h6M9 15h6"></path>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <!-- 对话区域 -->
    <div class="chat-container">
      <!-- 历史消息列表 -->
      <div v-if="showHistory" class="history-panel" @click.stop>
        <div class="history-wrapper">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            :class="['message', msg.role]"
          >
            <div class="message-content">
              <div v-if="msg.role === 'assistant'" v-html="parseMarkdown(msg.content)"></div>
              <div v-else>{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 当前消息（居中显示） -->
      <div v-else class="current-message-wrapper">
        <div v-if="latestMessage && !hideCurrentMessage" :class="['message', latestMessage.role]">
          <button @click.stop="hideCurrentMessage = true" class="close-message-btn" title="关闭消息">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="message-content">
            <div v-if="latestMessage.role === 'assistant'" v-html="parseMarkdown(latestMessage.content)"></div>
            <div v-else>{{ latestMessage.content }}</div>
          </div>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="isLoading" class="message assistant">
          <div class="message-content loading">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部操作栏 -->
    <div v-if="!showInput && !showVoiceInput" class="bottom-bar" @click.stop>
      <button class="action-btn" disabled title="在问">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      <button class="action-btn voice-input-btn" @click="toggleVoiceInput" :title="'语音输入'">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </button>
      <button class="action-btn keyboard-btn" :class="{ active: showInput }" @click="showInput = !showInput" title="键盘输入">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M9 16h6"></path>
        </svg>
      </button>
    </div>
    
    <!-- 输入框 -->
    <div v-if="showInput" class="input-container" @click.stop>
      <input 
        v-model="userInput" 
        type="text" 
        placeholder="请输入您的问题..."
        @keyup.enter="sendMessage"
        class="message-input"
      />
      <button @click="sendMessage" :disabled="!userInput.trim() || isLoading" class="send-btn">
        发送
      </button>
    </div>
    
    <!-- 语音输入界面 -->
    <div v-if="showVoiceInput" class="voice-input-container" @click.stop>
      <div class="voice-input-content">
        <div class="recognized-text" v-if="recognizedText">
          {{ recognizedText }}
        </div>
        <div class="voice-error" v-else-if="micPermissionError">
          {{ micPermissionError }}
        </div>
        <div class="voice-hint" v-else>
          {{ isRecording ? '正在识别...' : '按住按钮开始说话' }}
        </div>
        <button 
          class="voice-record-btn" 
          :class="{ recording: isRecording }"
          @touchstart.prevent="handleTouchStart"
          @touchend.prevent="handleTouchEnd"
          @touchcancel.prevent="handleTouchEnd"
          @mousedown.prevent="handleTouchStart"
          @mouseup.prevent="handleTouchEnd"
        >
          <svg v-if="!isRecording" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"></line>
            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"></line>
          </svg>
          <div v-else class="recording-animation">
            <span class="pulse"></span>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"></rect>
              <rect x="14" y="4" width="4" height="16" rx="1"></rect>
            </svg>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { marked } from 'marked'
import { sendChatMessage } from './services/ai'
import { textToSpeech, playAudioWithControl, stopAudio } from './services/tts'
import { startVoiceRecognition, stopVoiceRecognition } from './services/asr'

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const showInput = ref(false)
const messagesWrapper = ref(null)
const isPlaying = ref(false)
const showHistory = ref(false)
const hideCurrentMessage = ref(false)
const isRecording = ref(false)
const recognizedText = ref('')
const showVoiceInput = ref(false)
const micPermissionError = ref('')

// 计算最新消息
const latestMessage = computed(() => {
  return messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
})

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// 解析 Markdown
const parseMarkdown = (text) => {
  return marked.parse(text)
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesWrapper.value) {
      messagesWrapper.value.scrollTop = messagesWrapper.value.scrollHeight
    }
  })
}

// 停止播放
const stopPlayback = () => {
  stopAudio()
  isPlaying.value = false
}

// 点击容器区域，关闭输入框和历史
const handleContainerClick = () => {
  // 只有在没有输入内容时才关闭
  if (showInput.value && !userInput.value.trim()) {
    showInput.value = false
  }
  if (showVoiceInput.value && !recognizedText.value.trim()) {
    showVoiceInput.value = false
  }
  if (showHistory.value) {
    showHistory.value = false
  }
}

// 切换语音输入
const toggleVoiceInput = () => {
  // 如果正在播放，先停止
  if (isPlaying.value) {
    stopPlayback()
  }
  
  showVoiceInput.value = !showVoiceInput.value
  if (showVoiceInput.value) {
    showInput.value = false
    recognizedText.value = ''
  }
}

// 触摸开始 - 开始录音
const handleTouchStart = async (e) => {
  if (isRecording.value || isLoading.value) return
  
  // 清除之前的错误信息
  micPermissionError.value = ''
  
  try {
    // 检查浏览器是否支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      micPermissionError.value = '您的浏览器不支持麦克风功能'
      return
    }
    
    isRecording.value = true
    recognizedText.value = ''
    
    await startVoiceRecognition({
      onResult: (text, isFinal) => {
        recognizedText.value = text
        console.log('识别结果:', text, '是否最终:', isFinal)
      },
      onError: (error) => {
        console.error('语音识别错误:', error)
        isRecording.value = false
        
        // 处理不同类型的错误
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          micPermissionError.value = '麦克风权限被拒绝，请在设置中允许访问麦克风'
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          micPermissionError.value = '未找到麦克风设备'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          micPermissionError.value = '麦克风被其他应用占用'
        } else if (error.message) {
          micPermissionError.value = `错误: ${error.message}`
        } else {
          micPermissionError.value = '启动麦克风失败，请重试'
        }
      },
      onCompleted: () => {
        console.log('识别完成')
      }
    })
  } catch (error) {
    console.error('启动录音失败:', error)
    isRecording.value = false
    
    // 处理权限错误
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      micPermissionError.value = '麦克风权限被拒绝，请在设置中允许访问麦克风'
    } else if (error.name === 'NotFoundError') {
      micPermissionError.value = '未找到麦克风设备'
    } else if (error.name === 'NotReadableError') {
      micPermissionError.value = '麦克风被其他应用占用'
    } else {
      micPermissionError.value = '启动录音失败: ' + (error.message || '未知错误')
    }
  }
}

// 触摸结束 - 停止录音并发送
const handleTouchEnd = async (e) => {
  console.log('isRecording.value', isRecording.value)
  if (!isRecording.value) return
  
  console.log('触摸结束，停止录音')
  isRecording.value = false
  stopVoiceRecognition()
  
  // 等待一小段时间确保最终识别结果返回
  await new Promise(resolve => setTimeout(resolve, 500))
  
  console.log('当前识别文本:', recognizedText.value)
  
  // 如果有识别结果，自动发送
  if (recognizedText.value.trim()) {
    console.log('准备发送消息:', recognizedText.value)
    userInput.value = recognizedText.value
    showVoiceInput.value = false
    await sendMessage()
  } else {
    console.log('没有识别到文本，不发送')
  }
}

// 兼容旧的函数名（如果其他地方有调用）
const startRecording = handleTouchStart
const stopRecording = handleTouchEnd

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return
  
  // 如果正在播放，先停止
  if (isPlaying.value) {
    stopPlayback()
  }
  
  const message = userInput.value.trim()
  userInput.value = ''
  
  // 隐藏输入框，回到按钮选择
  showInput.value = false
  
  // 显示新消息（重置隐藏状态）
  hideCurrentMessage.value = false
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message
  })
  scrollToBottom()
  
  isLoading.value = true
  
  try {
    // 调用 AI 接口
    const response = await sendChatMessage(messages.value)
    
    // 添加 AI 回复
    messages.value.push({
      role: 'assistant',
      content: response
    })
    scrollToBottom()
    
    // AI 对话完成，结束加载状态
    isLoading.value = false
    
    // 使用 TTS 播报（异步，不阻塞）
    try {
      isPlaying.value = true
      const audioUrl = await textToSpeech(response, {
        voice: 'xiaoyun'
      })
      
      await playAudioWithControl(audioUrl, () => {
        isPlaying.value = false
      })
    } catch (ttsError) {
      console.error('TTS 播报失败:', ttsError)
      isPlaying.value = false
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我遇到了一些问题，请稍后再试。'
    })
    scrollToBottom()
    isLoading.value = false
  }
}

onMounted(() => {
  // 添加欢迎消息
  messages.value.push({
    role: 'assistant',
    content: '您好！我是数智人助手，有什么可以帮助您的吗？'
  })
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('./assets/WechatIMG377.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.top-buttons {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  gap: 12px;
}

.history-btn,
.stop-play-btn {
  width: 50px;
  height: 50px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(15px);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.history-btn:hover,
.stop-play-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.05);
}

.stop-play-btn {
  background: rgba(255, 100, 100, 0.5);
  border-color: rgba(255, 100, 100, 0.5);
  animation: pulse 2s infinite;
}

.stop-play-btn:hover {
  background: rgba(255, 100, 100, 0.7);
  border-color: rgba(255, 100, 100, 0.7);
}

.chat-container {
  position: relative;
  width: 100%;
  height: 100vh;
  z-index: 1;
}

.history-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  padding: 80px 20px 20px;
  overflow-y: auto;
}

.history-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 100px;
}

.current-message-wrapper {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.messages-wrapper::-webkit-scrollbar {
  width: 6px;
}

.messages-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.messages-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.message {
  margin-bottom: 16px;
  display: flex;
  animation: fadeIn 0.5s ease-in;
  width: 100%;
  justify-content: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.history-panel .message.user {
  justify-content: flex-end;
}

.history-panel .message.assistant {
  justify-content: flex-start;
}

.current-message-wrapper .message {
  justify-content: flex-start;
  position: relative;
}

.close-message-btn {
  position: absolute;
  top: -40px;
  right: 0px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: 0.7;
}

.close-message-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  opacity: 1;
  transform: scale(1.1);
}

.current-message-wrapper .message .message-content {
  max-width: 100%;
  max-height: 50vh;
  overflow-y: auto;
  text-align: left;
  font-size: 18px;
  padding: 20px 30px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.current-message-wrapper .message .message-content::-webkit-scrollbar {
  width: 6px;
}

.current-message-wrapper .message .message-content::-webkit-scrollbar-track {
  background: transparent;
}

.current-message-wrapper .message .message-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.message-content {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.0);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.message.user .message-content {
  background: rgba(100, 150, 255, 0.0);
  border-color: rgba(100, 150, 255, 0.3);
}

.message.assistant .message-content {
  background: rgba(0, 0, 0, 0.0);
  border-color: rgba(255, 255, 255, 0.1);
}

.message-content :deep(p) {
  margin: 0 0 8px 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(code) {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.message-content :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content :deep(pre code) {
  background: none;
  padding: 0;
}

.message-content.loading {
  display: flex;
  gap: 6px;
  padding: 16px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.bottom-bar {
  position: absolute;
  bottom: 70px;
  bottom: calc(70px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 90%;
}

.action-btn {
  width: 60px;
  height: 60px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.action-btn svg {
  flex-shrink: 0;
}

.action-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.action-btn:not(:disabled):active {
  transform: translateY(0);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  background: rgba(100, 150, 255, 0.4);
  border-color: rgba(100, 150, 255, 0.6);
  box-shadow: 0 0 20px rgba(100, 150, 255, 0.3);
}

.keyboard-btn:not(:disabled) {
  background: rgba(100, 150, 255, 0.3);
  border-color: rgba(100, 150, 255, 0.5);
}

.input-container {
  position: absolute;
  bottom: 70px;
  border-radius: 16px;
  left: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 15px;
  outline: none;
  backdrop-filter: blur(5px);
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.send-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 20px;
  background: rgba(100, 150, 255, 0.6);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.send-btn:not(:disabled):hover {
  background: rgba(100, 150, 255, 0.8);
  transform: scale(1.05);
}

.send-btn:not(:disabled):active {
  transform: scale(0.98);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 停止播放按钮 */
.stop-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid rgba(255, 100, 100, 0.5);
  border-radius: 25px;
  background: rgba(255, 100, 100, 0.25);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 100, 100, 0.2);
  animation: pulse 2s infinite;
}

.stop-btn:hover {
  background: rgba(255, 100, 100, 0.35);
  border-color: rgba(255, 100, 100, 0.7);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 100, 100, 0.3);
}

.stop-btn:active {
  transform: translateY(0);
}

.stop-btn svg {
  width: 20px;
  height: 20px;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(255, 100, 100, 0.2);
  }
  50% {
    box-shadow: 0 4px 20px rgba(255, 100, 100, 0.4);
  }
}

/* 语音输入容器 */
.voice-input-container {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  width: 90%;
  max-width: 500px;
  padding: 30px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.voice-input-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.recognized-text {
  min-height: 60px;
  width: 100%;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #fff;
  font-size: 16px;
  line-height: 1.6;
  text-align: center;
  word-wrap: break-word;
}

.voice-hint {
  min-height: 60px;
  width: 100%;
  padding: 16px 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-error {
  min-height: 60px;
  width: 100%;
  padding: 16px 20px;
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.4);
  border-radius: 16px;
  color: #ffcccc;
  font-size: 14px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.5;
}

.voice-record-btn {
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 50%;
  background: rgba(100, 150, 255, 0.3);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 16px rgba(100, 150, 255, 0.2);
}

.voice-record-btn:hover {
  background: rgba(100, 150, 255, 0.4);
  transform: scale(1.05);
}

.voice-record-btn:active {
  transform: scale(0.95);
}

.voice-record-btn.recording {
  background: rgba(255, 100, 100, 0.4);
  animation: recordingPulse 1.5s infinite;
}

.recording-animation {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 100, 100, 0.3);
  animation: pulseExpand 1.5s infinite;
}

@keyframes recordingPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(255, 100, 100, 0.3);
  }
  50% {
    box-shadow: 0 4px 32px rgba(255, 100, 100, 0.6);
  }
}

@keyframes pulseExpand {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.voice-input-btn {
  background: rgba(255, 150, 100, 0.3);
  border-color: rgba(255, 150, 100, 0.5);
}
</style>
