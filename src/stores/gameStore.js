import { defineStore } from 'pinia'


// 预设关卡
const LEVELS = [
  { id: 1, phrase: '龙马精神万事如意', name: '特别关：2026新春快乐', initialChars: ['祝'] },
  { id: 2, phrase: '我的愿望是世界和平', name: '第一关：世界和平', initialChars: ['喵'] },
  { id: 3, phrase: '春暖花开日月明朗', name: '第二关：美好时光', initialChars: ['汪'] },
  { id: 4, phrase: '爱国富强和谐友善敬业福', name: '第三关：集五福', initialChars: ['宝'] },
  { id: 5, phrase: '一二三四五六七八九十百千万', name: '第四关：数来宝', initialChars: ['陈', '景', '润'] },
  { id: 6, phrase: '黄龙江一派全都带蓝牙', name: '第五关：高速运转', initialChars: ['啊', '巴'] }
];

// 从localStorage获取已收集的字符，如果没有则使用初始字符
const getSavedChars = (levelId = '1') => {
  const savedChars = localStorage.getItem('collectedChars');
  if (savedChars) {
    return new Set(JSON.parse(savedChars));
  }
  const level = LEVELS.find(l => l.id === parseInt(levelId));
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
  state: () => {
    const currentLevel = localStorage.getItem('currentLevel') || '1';
    return {
      tokens: parseInt(localStorage.getItem('tokens')) || 0,
      totalUsedTokens: parseInt(localStorage.getItem('totalUsedTokens')) || 0,
      currentLevel: currentLevel,
      targetPhrase: (() => {
        if (currentLevel === 'custom') {
          return localStorage.getItem('customPhrase') || '';
        } else {
          const level = LEVELS.find(l => l.id.toString() === currentLevel);
          return level ? level.phrase : LEVELS[0].phrase;
        }
      })(),
      collectedChars: getSavedChars(currentLevel),
      customPhrase: localStorage.getItem('customPhrase') || '',
      hasCompletedAnyLevel: localStorage.getItem('hasCompletedAnyLevel') === 'true',
      currentPrompt: '',
      llmResponse: '',
      levels: LEVELS,
      highlightMoments: JSON.parse(localStorage.getItem('highlightMoments')) || [],
      showRulesModal: false,
    };
  },

  getters: {
    canGenerateResponse: (state) => true,
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
      this.addUsedTokens(amount);
      return true;
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
      this.totalUsedTokens -= amount;
      localStorage.setItem('totalUsedTokens', this.totalUsedTokens.toString());
    },

    // 清除游戏进度
    clearGameProgress() {
      // 不再保留 API 配置
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

      localStorage.setItem('tokens', '0');
      localStorage.setItem('totalUsedTokens', '0');
      localStorage.setItem('collectedChars', JSON.stringify(Array.from(this.collectedChars)));
      localStorage.setItem('highlightMoments', JSON.stringify([]));
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
        // 保存当前关卡
        const currentLevel = this.currentLevel;
        this.clearGameProgress();
        // 恢复当前关卡
        this.currentLevel = currentLevel;
        localStorage.setItem('currentLevel', this.currentLevel.toString());
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
