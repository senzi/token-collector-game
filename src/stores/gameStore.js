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

const SYSTEM_PROMPT = '你服务的对象能使用的文字有限，可能不成句子。但你很有耐心，请尽可能理解TA的意图。回复不带列表，不带Markdown。仅用中文回复。没有起手式，直述，出其不意。不打招呼！'

// 预设关卡
const LEVELS = [
  { id: 1, phrase: '我的愿望是世界和平', name: '第一关：世界和平' },
  { id: 2, phrase: '春暖花开日月明朗', name: '第二关：美好时光' },
  { id: 3, phrase: '爱国富强和谐友善敬业福', name: '第三关：集五福' }
];

// 从localStorage获取已收集的字符，如果没有则使用初始字符
const getSavedChars = () => {
  const savedChars = localStorage.getItem('collectedChars');
  return savedChars ? new Set(JSON.parse(savedChars)) : new Set(['你', '好']);
};

// 获取当前关卡的目标短语
const getCurrentLevelPhrase = () => {
  const currentLevel = localStorage.getItem('currentLevel') || '1';
  const customPhrase = localStorage.getItem('customPhrase');
  
  if (currentLevel === 'custom' && customPhrase) {
    return customPhrase;
  }
  
  const level = LEVELS.find(l => l.id === parseInt(currentLevel));
  return level ? level.phrase : LEVELS[0].phrase;
};

export const useGameStore = defineStore('game', {
  state: () => ({
    tokens: parseInt(localStorage.getItem('tokens')) || 0,
    totalUsedTokens: parseInt(localStorage.getItem('totalUsedTokens')) || 0,
    collectedChars: getSavedChars(),
    targetPhrase: getCurrentLevelPhrase(),
    currentLevel: localStorage.getItem('currentLevel') || '1',
    customPhrase: localStorage.getItem('customPhrase') || '',
    hasCompletedAnyLevel: localStorage.getItem('hasCompletedAnyLevel') === 'true',
    currentPrompt: '',
    llmResponse: '',
    apiKey: localStorage.getItem('apiKey') || '',
    baseApi: localStorage.getItem('baseApi') || presetConfigs[0].baseApi,
    model: localStorage.getItem('model') || presetConfigs[0].model,
    presetConfigs: presetConfigs,
    levels: LEVELS,
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
    collectedCharsCount: (state) => state.collectedChars.size,
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

    // 切换关卡
    async switchLevel(levelId, customPhrase = '') {
      // 如果是自定义关卡
      if (levelId === 'custom') {
        if (!this.hasCompletedAnyLevel) {
          throw new Error('需要完成任意官方关卡后才能使用自定义关卡');
        }
        // 过滤只保留中文字符
        const filteredPhrase = customPhrase.replace(/[^\u4e00-\u9fa5]/g, '');
        if (!filteredPhrase) {
          throw new Error('请输入有效的中文字符');
        }
        this.customPhrase = filteredPhrase;
        this.targetPhrase = filteredPhrase;
        this.currentLevel = 'custom';
        localStorage.setItem('customPhrase', filteredPhrase);
      } else {
        const level = this.levels.find(l => l.id === levelId);
        if (!level) {
          throw new Error('无效的关卡');
        }
        this.targetPhrase = level.phrase;
        this.currentLevel = levelId;
      }
      
      // 保存当前关卡
      localStorage.setItem('currentLevel', this.currentLevel.toString());
      
      // 清除游戏进度
      this.clearGameProgress();
    },

    // 标记完成任意关卡
    markLevelCompleted() {
      this.hasCompletedAnyLevel = true;
      localStorage.setItem('hasCompletedAnyLevel', 'true');
    },
  }
})
