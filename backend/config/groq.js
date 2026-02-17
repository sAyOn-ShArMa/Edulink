const Groq = require('groq-sdk');

let groq = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  console.warn('GROQ_API_KEY not set — AI features will be disabled');
}

module.exports = groq;
