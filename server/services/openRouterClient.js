/**
 * OpenRouter API Client for AI Chat
 * Handles communication with OpenRouter API for workout plan refinement
 */

class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.model = 'deepseek/deepseek-chat';
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

    const payload = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: false
    };

    console.log('[OPENROUTER] Sending request:', {
      model: payload.model,
      messageCount: messages.length,
      temperature: payload.temperature
    });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gofitai-production.up.railway.app',
          'X-Title': 'GoFitAI'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const choice = data.choices[0];
        return {
          content: choice.message?.content || '',
          model: data.model || this.model,
          usage: data.usage
        };
      } else {
        throw new Error('No response choices received from OpenRouter');
      }

    } catch (error) {
      console.error('[OPENROUTER] Request failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const testMessages = [
        { role: 'user', content: 'Hello, can you respond with just "OK"?' }
      ];
      
      const response = await this.chat(testMessages);
      return response.content.includes('OK');
    } catch (error) {
      console.error('[OPENROUTER] Connection test failed:', error);
      return false;
    }
  }
}

module.exports = OpenRouterClient;


















































































