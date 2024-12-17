<script setup>
import { ref, onMounted, computed, h, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import { llmService } from './services/api'
import {
  NConfigProvider,
  NMessageProvider,
  NButton,
  NInput,
  NSpace,
  NModal,
  NCard,
  NTag,
  NScrollbar,
  NSelect,
  NRadioGroup,
  NRadio,
  useMessage,
  createDiscreteApi
} from 'naive-ui'
import { Fireworks } from 'fireworks-js'

const { message, dialog } = createDiscreteApi(['message', 'dialog'])

const gameStore = useGameStore()
const showSettingsModal = ref(false)
const apiKeyInput = ref('')
const baseApiInput = ref('')
const modelInput = ref('')
const selectedPreset = ref(null)
const fireworks = ref(null)
const showRefund = ref(false)
const refundAmount = ref(0)
const inputChar = ref('')
const showLevelModal = ref(false);
const selectedLevel = ref(gameStore.currentLevel);
const customLevelPhrase = ref(gameStore.customPhrase);

const isValidChar = computed(() => {
  if (!inputChar.value) return true;
  return gameStore.collectedChars.has(inputChar.value);
});

const getValidationMessage = () => {
  if (!inputChar.value) return '';
  return isValidChar.value ? '✓ 可用' : '✗ 未在字库中';
};

// 配置API
const openSettings = () => {
  apiKeyInput.value = gameStore.apiKey;
  baseApiInput.value = gameStore.baseApi;
  modelInput.value = gameStore.model;
  selectedPreset.value = null;
  showSettingsModal.value = true;
};

const handlePresetChange = (presetName) => {
  const preset = gameStore.presetConfigs.find(c => c.name === presetName);
  if (preset) {
    baseApiInput.value = preset.baseApi;
    modelInput.value = preset.model;
  }
};

const saveSettings = () => {
  if (!apiKeyInput.value.trim()) {
    message.warning('请输入API Key');
    return;
  }

  try {
    gameStore.setApiConfig(
      apiKeyInput.value,
      baseApiInput.value,
      modelInput.value
    );
    showSettingsModal.value = false;
    message.success('配置已保存');
  } catch (error) {
    message.error('保存配置失败');
  }
};

// 添加字符到提示词
const appendChar = (char) => {
  if (gameStore.currentPrompt.length < 200) {
    gameStore.updateCurrentPrompt(gameStore.currentPrompt + char);
  }
};

// 字符处理
const handleCharInput = () => {
  if (inputChar.value.length === 1) {
    if (isValidChar.value) {
      addChar();
    }
  }
};

const addChar = () => {
  if (inputChar.value && isValidChar.value) {
    const newPrompt = gameStore.currentPrompt + inputChar.value;
    if (newPrompt.length <= 200) {
      gameStore.updateCurrentPrompt(newPrompt);
      inputChar.value = '';
    }
  }
};

const removeChar = (index) => {
  gameStore.updateCurrentPrompt(
    gameStore.currentPrompt.slice(0, index) +
    gameStore.currentPrompt.slice(index + 1)
  );
};

// Token返还提示
const showRefundMessage = (amount) => {
  refundAmount.value = amount;
  showRefund.value = true;
  setTimeout(() => {
    showRefund.value = false;
  }, 3000);
};

// 生成回复
const generateResponse = async () => {
  if (!gameStore.canGenerateResponse || !gameStore.currentPrompt || gameStore.isGameComplete) {
    return;
  }

  // 检查API配置
  if (!gameStore.apiKey) {
    message.error('请先配置API Key');
    openSettings();
    return;
  }

  try {
    gameStore.spendTokens(50);

    const response = await llmService.generateResponse(
      gameStore.currentPrompt,
      gameStore.apiKey,
      gameStore.baseApi,
      gameStore.model,
      gameStore.systemPrompt
    );

    const usedTokens = response.usage.completion_tokens || 0;
    const refund = 50 - usedTokens;
    if (refund > 0) {
      gameStore.refundTokens(refund);
      showRefundMessage(refund);
    }

    gameStore.setLlmResponse(response.content);
    gameStore.addCollectedChars(response.content);
    gameStore.updateCurrentPrompt('');

    if (gameStore.isGameComplete) {
      showFireworks();
    }
  } catch (error) {
    gameStore.refundTokens(50);

    const errorMsg = error.response?.data?.error?.message || error.message;
    message.error({
      content: `请求失败: ${errorMsg}`,
      duration: 5000,
      closable: true
    });
  }
};

// 烟花效果
const showFireworks = () => {
  const container = document.querySelector('.fireworks-container');
  if (container && !fireworks.value) {
    fireworks.value = new Fireworks(container, {
      autoresize: true,
      opacity: 0.5,
      acceleration: 1.05,
      friction: 0.97,
      gravity: 1.5,
      particles: 50,
      traceLength: 3,
      traceSpeed: 10,
      explosion: 5,
      intensity: 30,
      flickering: 50,
      lineStyle: 'round',
      hue: {
        min: 0,
        max: 360
      },
      delay: {
        min: 30,
        max: 60
      },
      rocketsPoint: {
        min: 50,
        max: 50
      },
      lineWidth: {
        explosion: {
          min: 1,
          max: 3
        },
        trace: {
          min: 1,
          max: 2
        }
      },
      brightness: {
        min: 50,
        max: 80
      },
      decay: {
        min: 0.015,
        max: 0.03
      }
    });
    fireworks.value.start();
  }
};

// 清除通关记录
const clearProgress = () => {
  const d = dialog.warning({
    title: '确认清除通关记录',
    content: '这将清除所有游戏进度，但保留API配置。此操作不可撤销，是否继续？',
    positiveText: '确认清除',
    negativeText: '取消',
    onPositiveClick: () => {
      gameStore.clearGameProgress();
      message.success('游戏进度已清除');
    }
  });
};

// 打开关卡选择
const openLevelSelect = () => {
  selectedLevel.value = gameStore.currentLevel;
  customLevelPhrase.value = gameStore.customPhrase;
  showLevelModal.value = true;
};

// 确认切换关卡
const confirmSwitchLevel = async () => {
  const d = dialog.warning({
    title: '确认切换关卡',
    content: '切换关卡将清除当前游戏进度，是否继续？',
    positiveText: '确认切换',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await gameStore.switchLevel(
          selectedLevel.value,
          customLevelPhrase.value
        );
        message.success('关卡切换成功');
        showLevelModal.value = false;
      } catch (error) {
        message.error(error.message);
      }
    }
  });
};

// 监听游戏完成
watch(() => gameStore.isGameComplete, (newValue) => {
  if (newValue) {
    gameStore.markLevelCompleted();
    showFireworks();
  }
});
</script>

<template>
  <n-message-provider>
    <n-config-provider>
      <div class="game-container">
        <!-- 标题 -->
        <h1 class="game-title">LLM字集 - 文字收集游戏</h1>
        <!-- 目标文字区域 -->
        <div class="target-section">
          <div class="section-header">
            <div class="section-title">目标文字</div>
            <n-button @click="openLevelSelect" size="small" type="primary">
              切换关卡
            </n-button>
          </div>
          <div class="target-chars">
            <n-tag v-for="(item, index) in gameStore.progress" :key="index"
              :type="item.collected ? 'success' : 'default'" size="large">
              {{ item.char }}
            </n-tag>
          </div>
          <div v-if="gameStore.isGameComplete" class="victory-message">
            通关！截图分享到微博吧w
          </div>
        </div>

        <!-- Token计数器和设置按钮 -->
        <div class="header">
          <div class="token-info">
            <div class="info-item">
              <span class="label">当前Token：</span>
              <span class="value">{{ gameStore.tokens }}</span>
            </div>
            <div class="info-item">
              <span class="label">累计消耗：</span>
              <span class="value">{{ gameStore.totalUsedTokens }}</span>
            </div>
            <div class="info-item">
              <span class="label">字库字数：</span>
              <span class="value">{{ gameStore.collectedCharsCount }}</span>
            </div>
          </div>
          <n-space justify="end" style="width: auto">
            <n-button class="settings-btn" @click="openSettings" size="small">设置</n-button>
            <n-button @click="clearProgress" type="warning" size="small">
              清除通关记录
            </n-button>
          </n-space>
        </div>

        <!-- 可用字库 -->
        <div class="char-library">
          <div class="section-title">可用字库</div>
          <n-scrollbar style="max-height: 300px">
            <div class="collected-chars">
              <n-space wrap>
                <n-tag v-for="char in Array.from(gameStore.collectedChars)" :key="char" size="large" :bordered="false"
                  style="cursor: pointer" @click="appendChar(char)">
                  {{ char }}
                </n-tag>
              </n-space>
            </div>
          </n-scrollbar>
        </div>

        <!-- 提示词区域 -->
        <div class="prompt-section">
          <div class="section-title">提示词区</div>
          <div class="input-description">输入单个字符或从字库中选择</div>
          <div class="prompt-input">
            <div class="input-wrapper">
              <input type="text" v-model="inputChar" @input="handleCharInput" @keydown.enter="addChar" placeholder="单字"
                maxlength="1" />
            </div>
            <span class="char-validation"
              :class="{ 'invalid': inputChar && !isValidChar, 'valid': inputChar && isValidChar }">
              {{ getValidationMessage() }}
            </span>
          </div>
          <div class="prompt-tags">
            <span v-for="(char, index) in gameStore.currentPrompt" :key="index" class="prompt-tag"
              @click="removeChar(index)">
              {{ char }}
            </span>
          </div>
        </div>

        <!-- LLM回复区域 -->
        <div class="response-section" v-if="gameStore.llmResponse">
          <div class="section-title">回复</div>
          <div class="llm-response">{{ gameStore.llmResponse }}</div>
        </div>

        <!-- 生成回复按钮 -->
        <div class="generate-button">
          <n-button type="primary" :disabled="!gameStore.canGenerateResponse ||
            gameStore.invalidChars(gameStore.currentPrompt).length > 0 ||
            !gameStore.currentPrompt.length ||
            gameStore.isGameComplete" @click="generateResponse">
            {{ gameStore.isGameComplete ? '已通关！' : '生成回复 (50 Token，限50字回复)' }}
          </n-button>
        </div>
        <!-- 获取Token按钮 -->
        <div class="collect-token-button">
          <n-button type="success" size="large" strong @click="gameStore.collectTokens">
            获取Token (+5)
          </n-button>
        </div>

        <!-- 设置对话框 -->
        <n-modal v-model:show="showSettingsModal">
          <n-card style="width: 600px" title="API设置" :bordered="false" size="huge" role="dialog" aria-modal="true">
            <n-space vertical>
              <n-select v-model:value="selectedPreset" :options="gameStore.presetConfigs.map(config => ({
                label: config.name,
                value: config.name
              }))" placeholder="选择预设配置" clearable @update:value="handlePresetChange" />
              <n-input v-model:value="apiKeyInput" type="password" placeholder="输入API Key" label="API Key" />
              <n-input v-model:value="baseApiInput" placeholder="输入Base API URL" label="Base API" />
              <n-input v-model:value="modelInput" placeholder="输入模型名称" label="Model" />
              <n-space justify="end">
                <n-button @click="showSettingsModal = false">取消</n-button>
                <n-button type="primary" @click="saveSettings">保存</n-button>
              </n-space>
            </n-space>
          </n-card>
        </n-modal>

        <!-- 关卡选择模态框 -->
        <n-modal v-model:show="showLevelModal" style="width: 600px">
          <n-card title="选择关卡" :bordered="false" size="huge" role="dialog" aria-modal="true">
            <n-space vertical>
              <n-radio-group v-model:value="selectedLevel">
                <n-space vertical>
                  <n-radio
                    v-for="level in gameStore.levels"
                    :key="level.id"
                    :value="level.id"
                  >
                    {{ level.name }}
                  </n-radio>
                  <n-radio
                    v-if="gameStore.hasCompletedAnyLevel"
                    value="custom"
                  >
                    自定义关卡
                  </n-radio>
                </n-space>
              </n-radio-group>

              <n-input
                v-if="selectedLevel === 'custom'"
                v-model:value="customLevelPhrase"
                type="textarea"
                placeholder="请输入自定义关卡的目标文字（仅支持中文字符）"
                :maxlength="50"
              />

              <n-space justify="end">
                <n-button @click="showLevelModal = false">取消</n-button>
                <n-button type="primary" @click="confirmSwitchLevel">
                  确认切换
                </n-button>
              </n-space>
            </n-space>
          </n-card>
        </n-modal>

        <!-- 烟花容器 -->
        <div class="fireworks-container"></div>
      </div>
      <!-- 页脚 -->
      <footer class="footer">
        <p>
          开源地址：<a href="https://github.com/senzi/token-collector-game" target="_blank">GitHub</a> |
          开发者：senzi & Windsurf |
          <a href="https://github.com/senzi/token-collector-game/blob/main/LICENSE" target="_blank">MIT License</a>
        </p>
      </footer>
    </n-config-provider>
  </n-message-provider>
</template>

<style scoped>
.game-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.target-section {
  text-align: center;
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}

.section-title {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
}

.target-chars {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
  justify-content: center;
}

.target-char {
  font-size: 1.5rem;
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s;
}

.target-char.collected {
  background: #52c41a;
  color: white;
  transform: scale(1.1);
}

.victory-message {
  text-align: center;
  color: #52c41a;
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 1rem;
  padding: 1rem;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  animation: bounce 1s infinite;
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.token-info {
  display: flex;
  gap: 20px;
  align-items: center;
  position: relative;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 0.9em;
  color: #666;
}

.value {
  font-size: 1.2em;
  font-weight: bold;
  color: #2080f0;
}

.token-refund {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  z-index: 10;
}

.main-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.char-library {
  margin-bottom: 20px;
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.input-description {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: inline-block;
}

.input-wrapper input {
  width: 60px;
  height: 40px;
  text-align: center;
  font-size: 1.2rem;
  padding: 0.5rem;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.input-wrapper input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  outline: none;
}

.char-validation {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.char-validation.valid {
  color: #52c41a;
}

.char-validation.invalid {
  color: #ff4d4f;
}

.prompt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  min-height: 40px;
  padding: 0.5rem;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.prompt-tag {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.prompt-tag:hover {
  background-color: #bae7ff;
}

.section-note {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.response-content {
  padding: 1rem;
  border-radius: 8px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

.generate-button {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.response-section {
  margin: 20px 0;
}

.token-collect {
  text-align: center;
  margin: 20px 0;
}

.fireworks-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.refund-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out;
}

.collect-token-button {
  text-align: center;
  margin-top: 20px;
}

.collect-token-button .n-button {
  min-width: 200px;
  font-weight: bold;
  font-size: 1.1em;
}

.game-title {
  text-align: center;
  font-size: 2em;
  margin-bottom: 1em;
  color: #2c3e50;
}

.footer {
  margin-top: 2em;
  padding: 1em;
  text-align: center;
  border-top: 1px solid #eee;
  color: #666;
}

.footer a {
  color: #42b983;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  90% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

.settings-btn {
  background-color: #4CAF50;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.settings-btn:hover {
  background-color: #45a049;
}

@media (max-width: 600px) {
  .game-container {
    padding: 10px;
  }

  .target-title {
    font-size: 1.2em;
  }

  .header {
    flex-direction: column;
    gap: 10px;
  }

  .token-info {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  .token-card {
    min-width: 100px;
  }
}
</style>
