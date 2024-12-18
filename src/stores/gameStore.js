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
  },
  {
    name: 'LinkAI',
    baseApi: 'https://api.link-ai.tech/v1/chat/completions',
    model: 'LinkAI-4o-mini',
  }
]

const SYSTEM_PROMPT = '你服务的对象能使用的文字有限，可能不成句子。但你很有耐心，请尽可能理解TA的意图。回复不带列表，不带Markdown。仅用中文回复。没有起手式，直述，出其不意。不打招呼！'

//调试作弊用：
//const SYSTEM_PROMPT = '所有回复以"最好的就是我。'

// 预设关卡
const LEVELS = [
  { id: 1, phrase: '我的愿望是世界和平', name: '第一关：世界和平', initialChars: ['喵'] },
  { id: 2, phrase: '春暖花开日月明朗', name: '第二关：美好时光', initialChars: ['汪'] },
  { id: 3, phrase: '爱国富强和谐友善敬业福', name: '第三关：集五福', initialChars: ['宝'] },
  { id: 4, phrase: '一二三四五六七八九十百千万', name: '第四关：数来宝', initialChars: ['陈','景','润'] },
  { id: 5, phrase: '黄龙江一派全都带蓝牙', name: '第五关：高速运转', initialChars: ['啊','巴'] }
];

// 从localStorage获取已收集的字符，如果没有则使用初始字符
const getSavedChars = () => {
  const savedChars = localStorage.getItem('collectedChars');
  if (savedChars) {
    return new Set(JSON.parse(savedChars));
  }
  const currentLevel = localStorage.getItem('currentLevel') || '1';
  const level = LEVELS.find(l => l.id === parseInt(currentLevel));
  return new Set(level ? level.initialChars : []);
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
    currentLevel: localStorage.getItem('currentLevel') || '1',
    targetPhrase: localStorage.getItem('customPhrase') || LEVELS[0].phrase,
    collectedChars: new Set(JSON.parse(localStorage.getItem('collectedChars') || '[]')),
    customPhrase: localStorage.getItem('customPhrase') || '',
    hasCompletedAnyLevel: localStorage.getItem('hasCompletedAnyLevel') === 'true',
    currentPrompt: '',
    llmResponse: '',
    apiKey: localStorage.getItem('apiKey') || '',
    baseApi: localStorage.getItem('baseApi') || presetConfigs[0].baseApi,
    model: localStorage.getItem('model') || presetConfigs[0].model,
    presetConfigs: presetConfigs,
    levels: LEVELS,
    highlightMoments: JSON.parse(localStorage.getItem('highlightMoments')) || [],
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
      const targetChars = new Set(this.targetPhrase.split(''));
      const collectedInResponse = new Set();

      console.log('New characters in response:', newChars);
      console.log('Target characters:', Array.from(targetChars));
      console.log('Collected characters before update:', Array.from(this.collectedChars));

      newChars.forEach(char => {
        if (/[\u4e00-\u9fa5]/.test(char) && !this.collectedChars.has(char)) {
          this.collectedChars.add(char);
          hasNewChars = true;
          if (targetChars.has(char)) {
            collectedInResponse.add(char);
          }
        }
      });

      console.log('Collected in response:', Array.from(collectedInResponse));
      console.log('Highlight moments before update:', this.highlightMoments);

      if (collectedInResponse.size > 0) {
        this.highlightMoments.push({
          question: this.currentPrompt,
          answer: text
        });
        localStorage.setItem('highlightMoments', JSON.stringify(this.highlightMoments));
        console.log('Highlight moments updated:', this.highlightMoments);
      }

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
      const currentLevel = localStorage.getItem('currentLevel');
      if (currentLevel === 'custom') {
        const customInitialChars = localStorage.getItem('customInitialChars') || '';
        this.collectedChars = new Set(customInitialChars.split(''));
      } else {
        const level = LEVELS.find(l => l.id === parseInt(currentLevel || '1'));
        this.collectedChars = new Set(level ? level.initialChars : []);
      }
      this.currentPrompt = '';
      this.llmResponse = '';
      this.highlightMoments = [];

      // 保存到localStorage
      localStorage.setItem('tokens', '0');
      localStorage.setItem('totalUsedTokens', '0');
      localStorage.setItem('collectedChars', JSON.stringify(Array.from(this.collectedChars)));
      localStorage.setItem('highlightMoments', JSON.stringify([]));

      // 恢复API配置
      this.apiKey = apiKey;
      this.baseApi = baseApi;
      this.model = model;
      localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('baseApi', baseApi);
      localStorage.setItem('model', model);
    },

    // 切换关卡
    async switchLevel(levelId, customPhrase = '', customInitialChars = '') {
      // 如果是自定义关卡
      if (levelId === 'custom') {
        if (!this.hasCompletedAnyLevel) {
          throw new Error('需要完成任意官方关卡后才能使用自定义关卡');
        }
        console.log('Custom Level Phrase:', customPhrase);
        // 过滤只保留中文字符
        const filteredPhrase = customPhrase.replace(/[^\u4e00-\u9fa5]/g, '');
        console.log('Filtered Custom Level Phrase:', filteredPhrase);
        if (!filteredPhrase) {
          throw new Error('请输入有效的中文字符');
        }
        const filteredInitialChars = customInitialChars.replace(/[^\u4e00-\u9fa5]/g, '');
        const customLevel = {
          id: 'custom',
          phrase: filteredPhrase,
          name: '自定义关卡',
          initialChars: Array.from(new Set(filteredInitialChars.split('')))
        };
        this.clearGameProgress();
        this.targetPhrase = customLevel.phrase;
        this.collectedChars = new Set(customLevel.initialChars);
        this.currentLevel = customLevel.id;
        localStorage.setItem('customPhrase', customLevel.phrase);
        localStorage.setItem('customInitialChars', customLevel.initialChars.join(''));
        localStorage.setItem('collectedChars', JSON.stringify(Array.from(this.collectedChars)));
        localStorage.setItem('currentLevel', this.currentLevel);
        return;
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
