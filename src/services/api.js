import axios from 'axios';

export const llmService = {
  async generateResponse(prompt, systemPrompt) {
    try {
      const response = await axios.post('/api/llm', {
        prompt,
        systemPrompt
      });

      return response.data;
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error(`API请求失败: ${error.message}`);
    }
  }
};
