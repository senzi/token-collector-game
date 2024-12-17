# LLM字集 - 文字收集游戏

一个有趣的文字收集游戏，通过与 AI 对话收集文字，完成特定目标短语的拼写。通过多个关卡的挑战，体验不同的文字收集目标。

## 功能特点

- 🎮 通过与 AI 对话收集文字
- 💰 Token 代币系统
- 🎯 目标短语完成度追踪
- 🎆 完成目标时的烟花庆祝效果
- 🎪 多关卡系统，支持自定义关卡
- 🤖 支持多个 AI 模型接入
- 📊 字库统计功能
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
git clone https://github.com/senzi/token-collector-game.git
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
npm run preview  # 预览构建结果
```

## 游戏玩法

1. 每次与 AI 对话需要消耗 50 个 Token
2. 从 AI 的回复中收集文字
3. 收集到的文字可以用来拼写目标短语
4. 完成目标短语后会触发烟花庆祝效果
5. 完成任意官方关卡后可以解锁自定义关卡功能

## 关卡系统

游戏包含三个官方关卡：
1. 第一关：世界和平
2. 第二关：美好时光
3. 第三关：集五福

完成任意官方关卡后，可以解锁自定义关卡功能，创建你自己的文字收集目标。

## API 配置

游戏支持以下 AI 模型：
- Moonshot AI (moonshot-v1-8k)
- DeepSeek (deepseek-chat)
- LinkAI (LinkAI-4o-mini)
- 自定义，填写base_url、key、model

使用前需要在设置中配置相应的 API Key。

## 本地存储

游戏会自动保存以下数据到本地：
- 收集的文字库
- Token 数量和消耗统计
- 当前关卡进度
- API 配置信息
- 通关记录

## 开发者

- senzi
- Windsurf

## 开源协议

[MIT License](LICENSE)
