# AI Chatbot with Internet Search

An intelligent chatbot powered by OpenAI's GPT that can search the internet to answer your questions with up-to-date information.

## Features

- Real-time web search integration using DuckDuckGo API
- Conversational AI powered by OpenAI GPT-3.5
- Clean and modern web interface
- Conversation history tracking
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key (Get one at https://platform.openai.com/api-keys)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to the `.env` file:
```
OPENAI_API_KEY=your_actual_api_key_here
```

## Usage

1. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Start chatting! Ask any question and the bot will search the internet to provide accurate answers.

## How It Works

1. User enters a question in the web interface
2. The backend searches DuckDuckGo for relevant information
3. Search results are sent to OpenAI GPT along with the user's question
4. GPT processes the information and generates a comprehensive answer
5. The response is displayed in the chat interface

## API Endpoints

- `POST /chat` - Send a message to the chatbot
  - Body: `{ message: string, conversationHistory: array }`
  - Returns: `{ response: string, searchPerformed: boolean }`

## Technologies Used

- **Backend:** Node.js, Express
- **AI:** OpenAI GPT-3.5-turbo
- **Search:** DuckDuckGo Instant Answer API
- **Frontend:** HTML, CSS, JavaScript
- **HTTP Client:** Axios

## Notes

- The chatbot maintains conversation history for context
- Web search is performed automatically for each question
- The free DuckDuckGo API is used for search (no API key required)
- OpenAI API usage will incur costs based on your usage

## Troubleshooting

### "Invalid API key" error
- Make sure your OpenAI API key is correctly added to the `.env` file
- Verify the API key is active at https://platform.openai.com/api-keys

### "Quota exceeded" error
- Check your OpenAI account billing and usage limits
- Ensure you have available credits

### Server connection error
- Make sure the server is running on port 3000
- Check if port 3000 is available (not used by another application)

## License

MIT
