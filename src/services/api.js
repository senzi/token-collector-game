import axios from 'axios';

export const llmService = {
  async generateResponse(prompt, apiKey, baseApi, model, systemPrompt) {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await axios.post(
        baseApi,
        {
          model: model,
          messages: messages,
          temperature: 0.8,
          max_tokens: 50
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 处理不同API的响应格式
      let content = '';
      if (response.data.choices && response.data.choices.length > 0) {
        content = response.data.choices[0].message?.content || response.data.choices[0].content || '';
      }

      // 返回内容和token使用情况
      return {
        content,
        usage: response.data.usage || { completion_tokens: 0 }
      };
    } catch (error) {
      console.error('LLM API Error:', error);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`API请求失败: ${errorMessage}`);
    }
  }
};
