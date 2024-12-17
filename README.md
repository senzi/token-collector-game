# Token Collector Game 文字收集游戏

一个有趣的文字收集游戏，通过与 AI 对话收集文字，完成特定目标短语的拼写。

## 功能特点

- 🎮 通过与 AI 对话收集文字
- 💰 Token 代币系统
- 🎯 目标短语完成度追踪
- 🎆 完成目标时的烟花庆祝效果
- 🤖 支持多个 AI 模型接入（Moonshot AI、DeepSeek）
- 💾 本地进度保存

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- Pinia - Vue 状态管理
- Naive UI - Vue3 组件库
- Fireworks-js - 烟花特效库

## 快速开始

1. 克隆项目
```bash
git clone [repository-url]
cd token-collector-game
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

## 游戏玩法

1. 每次与 AI 对话需要消耗 50 个 Token
2. 从 AI 的回复中收集文字
3. 收集到的文字可以用来拼写目标短语
4. 完成目标短语后会触发烟花庆祝效果

## API 配置

游戏支持以下 AI 模型：
- Moonshot AI (moonshot-v1-8k)
- DeepSeek (deepseek-chat)

使用前需要在设置中配置相应的 API Key。

## 本地存储

游戏会自动保存以下数据到本地：
- 收集的文字
- Token 数量
- API 配置信息

## 开源协议

[MIT License](LICENSE)
