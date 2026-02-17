const groq = require('../config/groq');

const MODEL = 'llama-3.3-70b-versatile';

async function summarizeTeacherMessages(messages) {
  const formatted = messages
    .map((m) => `[${m.created_at}] ${m.sender_name}: ${m.content}`)
    .join('\n');

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: 'You are an educational assistant that summarizes teacher messages for students.',
      },
      {
        role: 'user',
        content: `Below are messages from a teacher in a class chat room.
Summarize the key points, instructions, assignments, and deadlines mentioned.
Write the summary in clear bullet points that a student can quickly scan.
Keep it concise but don't miss important details.

Teacher messages:
${formatted}

Summary:`,
      },
    ],
  });

  return response.choices[0].message.content;
}

async function structurePdfContent(rawText) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a textbook analyzer. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `You are given raw extracted text from an educational PDF textbook.
Identify the units/chapters, their titles, and key topics.
Return a JSON object with this structure:
{
  "units": [
    {"unit_number": 1, "title": "...", "key_topics": ["...", "..."]},
    ...
  ]
}

Extracted text (first 8000 chars):
${rawText.substring(0, 8000)}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

async function generateFlashcards(text, scope, unitTitle) {
  const scopeInstruction =
    scope === 'unit'
      ? `Focus only on the content related to: "${unitTitle}"`
      : 'Cover the entire book content';

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an educational flashcard generator. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Given the following textbook content, create flashcards for studying.
${scopeInstruction}

Generate 15-25 flashcards. For each flashcard, provide:
- A clear question or term on the "front"
- A concise answer or definition on the "back"
- A difficulty level: easy, medium, or hard

Return as a JSON object with a "flashcards" key:
{
  "flashcards": [
    {"front": "...", "back": "...", "difficulty": "medium"},
    ...
  ]
}

Textbook content:
${text.substring(0, 12000)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.flashcards || parsed;
}

async function analyzeGradesheet(extractedData) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an academic advisor AI. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `A student has uploaded their gradesheet.
Analyze their performance and create a personalized study improvement schedule.

Grade data:
${JSON.stringify(extractedData, null, 2)}

Provide:
1. A brief analysis of strengths and weaknesses
2. A weekly study schedule (Monday-Sunday) with specific time blocks
3. For each study block: subject, duration, specific focus area, and study technique
4. Prioritize subjects where the student is weakest
5. Include breaks and review sessions

Return as JSON:
{
  "analysis": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "overall_assessment": "..."
  },
  "weekly_schedule": [
    {
      "day": "Monday",
      "blocks": [
        {"time": "4:00 PM - 5:30 PM", "subject": "...", "focus": "...", "technique": "..."}
      ]
    }
  ],
  "recommendations": ["...", "..."]
}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

async function parseGradesheetText(rawText) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a gradesheet parser. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `You are given raw extracted text from a student gradesheet/report card.
Parse the grades and return structured data.

Return as JSON:
{
  "subjects": [
    {"name": "...", "grade": "...", "percentage": ..., "remarks": "..."},
    ...
  ],
  "overall_percentage": ...,
  "overall_grade": "..."
}

Raw text:
${rawText.substring(0, 5000)}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

async function chatAssistant(question, context) {
  const conversationHistory = context.recentMessages
    .map((m) => `[${m.sender_role}] ${m.sender_name}: ${m.content}`)
    .join('\n');

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: `You are an educational AI assistant integrated into a student-teacher chat for the class "${context.className}" (${context.subject}), taught by ${context.teacherName}.

Your role:
- Help students understand concepts from this class
- Summarize or explain teacher instructions when asked
- Answer subject-specific questions within the scope of this class
- Be encouraging and educational in tone
- If you don't know something specific to this class, say so honestly
- Keep answers concise but thorough`,
      },
      {
        role: 'user',
        content: `Recent conversation context:
${conversationHistory || '(No prior messages)'}

Student's question: ${question}`,
      },
    ],
  });

  return response.choices[0].message.content;
}

async function generateChapterFlashcards(text, chapterTitle) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an educational flashcard generator. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Given the following textbook content, create flashcards specifically for the chapter titled: "${chapterTitle}"

Generate 10-20 flashcards focused on this chapter. For each flashcard, provide:
- A clear question or term on the "front"
- A concise answer or definition on the "back"
- A difficulty level: easy, medium, or hard

Return as a JSON object with a "flashcards" key:
{
  "flashcards": [
    {"front": "...", "back": "...", "difficulty": "medium"},
    ...
  ]
}

Textbook content:
${text.substring(0, 12000)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.flashcards || parsed;
}

// Generate MCQ quiz questions from textbook content
async function generateQuizQuestions(text, scope, unitTitle) {
  const scopeInstruction =
    scope === 'unit'
      ? `Focus only on the content related to: "${unitTitle}"`
      : 'Cover the entire book content';

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an educational quiz generator. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Given the following textbook content, create multiple-choice quiz questions.
${scopeInstruction}

Generate 10-15 MCQ questions. For each question, provide:
- A clear question
- Four options (A, B, C, D)
- The correct option letter
- A difficulty level: easy, medium, or hard

Return as a JSON object:
{
  "questions": [
    {
      "question": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_option": "A",
      "difficulty": "medium"
    }
  ]
}

Textbook content:
${text.substring(0, 12000)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.questions || parsed;
}

// Generate MCQ quiz questions for a specific chapter
async function generateChapterQuiz(text, chapterTitle) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an educational quiz generator. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Given the following textbook content, create multiple-choice quiz questions specifically for the chapter titled: "${chapterTitle}"

Generate 8-12 MCQ questions focused on this chapter. For each question, provide:
- A clear question
- Four options (A, B, C, D)
- The correct option letter
- A difficulty level: easy, medium, or hard

Return as a JSON object:
{
  "questions": [
    {
      "question": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_option": "A",
      "difficulty": "medium"
    }
  ]
}

Textbook content:
${text.substring(0, 12000)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.questions || parsed;
}

module.exports = {
  summarizeTeacherMessages,
  structurePdfContent,
  generateFlashcards,
  generateChapterFlashcards,
  chatAssistant,
  analyzeGradesheet,
  parseGradesheetText,
  generateQuizQuestions,
  generateChapterQuiz,
};
