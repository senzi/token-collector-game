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
const fireworks = ref(null)
const showRefund = ref(false)
const refundAmount = ref(0)
const inputChar = ref('')
const showLevelModal = ref(false);
const selectedLevel = ref(gameStore.currentLevel);
const customLevelPhrase = ref(gameStore.customPhrase);
const customInitialChars = ref('');
const lastPrompt = ref('');

const isValidChar = computed(() => {
  if (!inputChar.value) return true;
  return gameStore.collectedChars.has(inputChar.value);
});

const getValidationMessage = () => {
  if (!inputChar.value) return '';
  return isValidChar.value ? '✓ 可用' : '✗ 未在字库中';
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

  // 缓存当前的提示词
  lastPrompt.value = gameStore.currentPrompt;

  try {
    gameStore.spendTokens(50);
    gameStore.isGeneratingResponse = true;

    const response = await llmService.generateResponse(
      gameStore.currentPrompt,
      gameStore.systemPrompt
    );
    gameStore.isGeneratingResponse = false;

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
    gameStore.isGeneratingResponse = false;
    gameStore.refundTokens(50);

    const errorMsg = error.response?.data?.error?.message || error.message;
    message.error(`请求失败: ${errorMsg}`, { duration: 5000, closable: true });
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

// 清除进度
const clearProgress = () => {
  const d = dialog.warning({
    title: '确认清除进度',
    content: '这将清除所有游戏进度。此操作不可撤销，是否继续？',
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
          customLevelPhrase.value,
          customInitialChars.value
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

const highlightAnswer = (answer) => {
  const targetChars = new Set(gameStore.targetPhrase.split(''));
  return answer.split('').map(char => {
    return targetChars.has(char) ? `<span class="highlight">${char}</span>` : char;
  }).join('');
};
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
            通关！截图分享给大家看看吧w
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
            <n-button @click="clearProgress" type="warning" size="small">
              清除进度
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
          <n-card>
            <n-space vertical>
              <div class="llm-question"><strong>问：</strong> {{ lastPrompt }}</div>
              <div class="llm-response">
                <strong>答：</strong>
                <span v-if="gameStore.isGeneratingResponse">LLM正在输入...</span>
                <span v-else v-html="highlightAnswer(gameStore.llmResponse)"></span>
              </div>
            </n-space>
          </n-card>
        </div>

        <!-- 生成回复按钮 -->
        <div class="generate-button">
          <n-button type="primary" :disabled="!gameStore.canGenerateResponse ||
            gameStore.invalidChars(gameStore.currentPrompt).length > 0 ||
            !gameStore.currentPrompt.length ||
            gameStore.isGameComplete" :loading="gameStore.isGeneratingResponse" @click="generateResponse">
            {{ gameStore.isGameComplete ? '已通关！' : '生成回复' }}
          </n-button>
          <span v-if="!gameStore.isGameComplete" class="token-info-text">← 需要50 Token</span>
        </div>
        <!-- 获取Token按钮 -->
        <div class="collect-token-button">
          <n-button type="success" size="large" strong @click="gameStore.collectTokens">
            获取Token (+5)
          </n-button>
          <span class="token-info-text">←点击相当于挖矿赚钱，才能发消息。</span>
        </div>

        <div class="highlight-moments" v-if="gameStore.highlightMoments.length > 0">
          <h3>高光时刻 <span style="font-size: 0.8em; color: gray;">(目标文字: {{ gameStore.targetPhrase }})</span></h3>
          <n-space vertical>
            <n-card v-for="(moment, index) in gameStore.highlightMoments" :key="index">
              <div><strong>问：</strong> {{ moment.question }}</div>
              <div><strong>答：</strong> <span v-html="highlightAnswer(moment.answer)"></span></div>
            </n-card>
          </n-space>
          <span style="display: block; text-align: center; color: gray;">请享受「狙击」成功的快乐w</span>
        </div>

        <!-- 关卡选择模态框 -->
        <n-modal v-model:show="showLevelModal" style="width: 600px">
          <n-card title="选择关卡" :bordered="false" size="huge" role="dialog" aria-modal="true">
            <n-space vertical>
              <n-radio-group v-model:value="selectedLevel">
                <n-space vertical>
                  <n-radio v-for="level in gameStore.levels" :key="level.id" :value="level.id">
                    {{ level.name }}
                  </n-radio>
                  <n-radio v-if="gameStore.hasCompletedAnyLevel" value="custom">
                    自定义关卡
                  </n-radio>
                </n-space>
              </n-radio-group>

              <n-input v-if="selectedLevel === 'custom'" v-model:value="customLevelPhrase" type="textarea"
                placeholder="请输入自定义关卡的目标文字（仅支持中文字符）" :maxlength="50" />
              <n-input v-if="selectedLevel === 'custom'" v-model:value="customInitialChars" type="textarea"
                placeholder="请输入自定义关卡的初始字符" />

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

<style>
.highlight {
  background-color: rgb(255, 255, 218);
  font-weight: bold;
}
</style>
