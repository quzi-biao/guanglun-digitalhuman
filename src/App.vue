<template>
  <div class="app-container">
    <!-- 背景图片 -->
    <div class="background"></div>
    
    <!-- 停止播放按钮 -->
    <button v-if="isPlaying" @click="stopPlayback" class="stop-btn">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      <span>停止播放</span>
    </button>
    
    <!-- 对话区域 -->
    <div class="chat-container">
      <div class="messages-wrapper" ref="messagesWrapper">
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
    <div class="bottom-bar">
      <button class="action-btn" disabled>
        <span>他们在问</span>
      </button>
      <button class="action-btn" disabled>
        <span>点击说话</span>
      </button>
      <button class="action-btn keyboard-btn" @click="showInput = !showInput">
        <span>键盘输入</span>
      </button>
    </div>
    
    <!-- 输入框 -->
    <div v-if="showInput" class="input-container">
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
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { marked } from 'marked'
import { sendChatMessage } from './services/ai'
import { textToSpeech, playAudioWithControl, stopAudio } from './services/tts'

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const showInput = ref(false)
const messagesWrapper = ref(null)
const isPlaying = ref(false)

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

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return
  
  // 如果正在播放，先停止
  if (isPlaying.value) {
    stopPlayback()
  }
  
  const message = userInput.value.trim()
  userInput.value = ''
  
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

.chat-container {
  position: relative;
  z-index: 1;
  height: calc(100vh - 120px);
  padding: 20px;
  overflow: hidden;
}

.messages-wrapper {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
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
  animation: fadeIn 0.3s ease-in;
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

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message.user .message-content {
  background: rgba(100, 150, 255, 0.25);
}

.message.assistant .message-content {
  background: rgba(255, 255, 255, 0.2);
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
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  justify-content: space-around;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.action-btn {
  flex: 1;
  margin: 0 8px;
  padding: 14px 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.action-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.action-btn:not(:disabled):active {
  transform: translateY(0);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.keyboard-btn:not(:disabled) {
  background: rgba(100, 150, 255, 0.3);
  border-color: rgba(100, 150, 255, 0.5);
}

.input-container {
  position: absolute;
  bottom: 80px;
  left: 20px;
  right: 20px;
  z-index: 3;
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(15px);
  border-radius: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
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
</style>
