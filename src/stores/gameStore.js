import { defineStore } from 'pinia'

const presetConfigs = [
  {
    name: 'Moonshot AI',
    baseApi: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
  },
  {
    name: 'DeepSeek',
    baseApi: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  }
]

const SYSTEM_PROMPT = '充满想象力，保持友好但有点儿阴阳怪气。回复问题不带列表，不带Markdown。仅用中文回复。没有起手式，直述答复，出其不意。'

// 从localStorage获取已收集的字符，如果没有则使用初始字符
const getSavedChars = () => {
  const savedChars = localStorage.getItem('collectedChars');
  return savedChars ? new Set(JSON.parse(savedChars)) : new Set(['你', '好']);
};

export const useGameStore = defineStore('game', {
  state: () => ({
    tokens: parseInt(localStorage.getItem('tokens')) || 0,
    totalUsedTokens: parseInt(localStorage.getItem('totalUsedTokens')) || 0,
    collectedChars: getSavedChars(),
    targetPhrase: '我的愿望是世界和平',
    currentPrompt: '',
    llmResponse: '',
    apiKey: localStorage.getItem('apiKey') || '',
    baseApi: localStorage.getItem('baseApi') || presetConfigs[0].baseApi,
    model: localStorage.getItem('model') || presetConfigs[0].model,
    presetConfigs: presetConfigs,
  }),

  getters: {
    canGenerateResponse: (state) => state.tokens >= 50,
    progress: (state) => {
      const targetChars = new Set(state.targetPhrase.split(''));
      const collected = new Set(state.collectedChars);
      return Array.from(targetChars).map(char => ({
        char,
        collected: collected.has(char)
      }));
    },
    isGameComplete: (state) => {
      return state.targetPhrase.split('').every(char => state.collectedChars.has(char));
    },
    systemPrompt: () => SYSTEM_PROMPT,
    // 检查输入是否包含未收集的字符
    invalidChars: (state) => (input) => {
      const chars = new Set(input.split(''));
      return Array.from(chars).filter(char => {
        return /[\u4e00-\u9fa5]/.test(char) && !state.collectedChars.has(char);
      });
    }
  },

  actions: {
    collectTokens() {
      this.tokens += 5;
      localStorage.setItem('tokens', this.tokens.toString());
    },
    
    spendTokens(amount) {
      if (this.tokens >= amount) {
        this.tokens -= amount;
        this.addUsedTokens(amount);
        localStorage.setItem('tokens', this.tokens.toString());
        return true;
      }
      return false;
    },

    addCollectedChars(text) {
      let hasNewChars = false;
      const newChars = text.split('');
      newChars.forEach(char => {
        if (/[\u4e00-\u9fa5]/.test(char) && !this.collectedChars.has(char)) {
          this.collectedChars.add(char);
          hasNewChars = true;
        }
      });
      if (hasNewChars) {
        localStorage.setItem('collectedChars', JSON.stringify(Array.from(this.collectedChars)));
      }
    },

    setApiConfig(key, baseApi, model) {
      this.apiKey = key;
      this.baseApi = baseApi;
      this.model = model;
      localStorage.setItem('apiKey', key);
      localStorage.setItem('baseApi', baseApi);
      localStorage.setItem('model', model);
    },

    updateCurrentPrompt(prompt) {
      this.currentPrompt = prompt;
    },

    setLlmResponse(response) {
      this.llmResponse = response;
    },

    addUsedTokens(amount) {
      this.totalUsedTokens += amount;
      localStorage.setItem('totalUsedTokens', this.totalUsedTokens.toString());
    },

    refundTokens(amount) {
      this.tokens += amount;
      this.totalUsedTokens -= amount; 
      localStorage.setItem('tokens', this.tokens.toString());
      localStorage.setItem('totalUsedTokens', this.totalUsedTokens.toString());
    },

    // 清除游戏进度，但保留API配置
    clearGameProgress() {
      // 保存当前的API配置
      const apiKey = this.apiKey;
      const baseApi = this.baseApi;
      const model = this.model;

      // 重置游戏状态
      this.tokens = 0;
      this.totalUsedTokens = 0;
      this.collectedChars = new Set(['你', '好']);
      this.currentPrompt = '';
      this.llmResponse = '';

      // 保存到localStorage
      localStorage.setItem('tokens', '0');
      localStorage.setItem('totalUsedTokens', '0');
      localStorage.setItem('collectedChars', JSON.stringify(['你', '好']));

      // 恢复API配置
      this.apiKey = apiKey;
      this.baseApi = baseApi;
      this.model = model;
      localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('baseApi', baseApi);
      localStorage.setItem('model', model);
    },
  }
})
