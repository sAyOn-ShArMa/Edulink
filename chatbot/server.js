const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Function to search the web using DuckDuckGo Instant Answer API
async function searchWeb(query) {
  try {
    const response = await axios.get(`https://api.duckduckgo.com/`, {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1
      }
    });

    let searchResults = '';

    if (response.data.Abstract) {
      searchResults += `Summary: ${response.data.Abstract}\n`;
    }

    if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
      searchResults += '\nRelated Information:\n';
      response.data.RelatedTopics.slice(0, 5).forEach((topic, index) => {
        if (topic.Text) {
          searchResults += `${index + 1}. ${topic.Text}\n`;
        }
      });
    }

    return searchResults || 'No specific results found.';
  } catch (error) {
    console.error('Search error:', error.message);
    return 'Unable to fetch search results at this time.';
  }
}

// Function to get AI response using HuggingFace Inference API (FREE, no authentication required)
async function getAIResponse(prompt) {
  try {
    // Try multiple free models in case one is down
    const models = [
      'mistralai/Mistral-7B-Instruct-v0.2',
      'microsoft/DialoGPT-large',
      'facebook/blenderbot-400M-distill'
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              top_p: 0.95,
              return_full_text: false
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (response.data && response.data[0]) {
          if (response.data[0].generated_text) {
            return response.data[0].generated_text;
          }
          if (response.data[0].generated_response) {
            return response.data[0].generated_response;
          }
        }

        // If model is loading, wait and try again
        if (response.data && response.data.error && response.data.error.includes('loading')) {
          console.log(`Model ${model} is loading, trying next...`);
          continue;
        }
      } catch (error) {
        console.error(`Error with model ${model}:`, error.message);
        lastError = error;
        continue;
      }
    }

    // If all models failed, use a fallback with search results
    throw lastError || new Error('All AI models unavailable');
  } catch (error) {
    console.error('AI Response error:', error.message);
    throw error;
  }
}

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Search the web for relevant information
    console.log('Searching web for:', message);
    const searchResults = await searchWeb(message);

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = 'Previous conversation:\n';
      conversationHistory.slice(-4).forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      conversationContext += '\n';
    }

    const prompt = `You are a helpful AI assistant. Answer the user's question using the web search results provided below. Be conversational, accurate, and concise.

${conversationContext}User question: ${message}

Web search results:
${searchResults}

Please provide a helpful answer based on the search results above. If the search results don't have enough information, use your general knowledge.

Answer:`;

    console.log('Getting AI response...');

    try {
      const assistantMessage = await getAIResponse(prompt);

      res.json({
        response: assistantMessage,
        searchPerformed: true
      });
    } catch (aiError) {
      // If AI fails, provide search results directly
      console.log('AI models unavailable, returning search results directly');

      let fallbackResponse = "I found this information from web search:\n\n" + searchResults;

      if (searchResults === 'No specific results found.') {
        fallbackResponse = "I apologize, but I'm having trouble accessing the AI models right now, and I couldn't find specific search results for your question. Please try asking a different question or try again in a moment.";
      }

      res.json({
        response: fallbackResponse,
        searchPerformed: true,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error:', error.message);

    res.status(500).json({
      error: 'An error occurred while processing your request. Please try again.',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n✓ Server is running on http://localhost:${PORT}`);
  console.log(`✓ Using FREE HuggingFace AI - No API key required!`);
  console.log(`✓ Web search enabled via DuckDuckGo`);
  console.log(`✓ Fallback mode: Returns search results if AI is unavailable\n`);
  console.log(`Note: First request may take 20-30 seconds as the AI model loads.\n`);
});
