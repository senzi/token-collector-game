import axios from 'axios';

export const llmService = {
  async generateResponse(prompt) {
    try {
      const response = await axios.post('/api/llm', {
        prompt,
        password: "silicon-truth-collector"
      }, {
        headers: {
          'Accept': 'application/x-silicon-truth'
        }
      });

      return response.data;
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error(`API请求失败: ${error.message}`);
    }
  }
};
