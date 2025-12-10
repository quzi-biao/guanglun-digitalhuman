<template>
  <div class="app-container" @click="handleContainerClick">
    <!-- 背景图片 -->
    <div class="background"></div>
    
    <!-- 右上角历史按钮 -->
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
    <div v-if="!showInput" class="bottom-bar" @click.stop>
      <button class="action-btn" disabled title="在问">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      <button class="action-btn" :class="{ active: isPlaying }" @click="isPlaying ? stopPlayback() : null" :title="isPlaying ? '停止播放' : '语音播报'">
        <svg v-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
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
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { marked } from 'marked'
import { sendChatMessage } from './services/ai'
import { textToSpeech, playAudioWithControl, stopAudio } from './services/tts'

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const showInput = ref(false)
const messagesWrapper = ref(null)
const isPlaying = ref(false)
const showHistory = ref(false)
const hideCurrentMessage = ref(false)

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
  if (showInput.value) {
    showInput.value = false
  }
  if (showHistory.value) {
    showHistory.value = false
  }
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

.history-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
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

.history-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.05);
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
  top: 60%;
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
  text-align: left;
  font-size: 18px;
  padding: 20px 30px;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.0);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
</style>
