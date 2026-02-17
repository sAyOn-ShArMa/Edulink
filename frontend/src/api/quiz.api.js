import api from './axios';

export const generateQuiz = (pdfBookId, scope, unitNumber, chapterTitle) =>
  api.post('/quiz/generate', { pdfBookId, scope, unitNumber, chapterTitle });
export const getQuizSets = (classId) => api.get(`/quiz/sets?classId=${classId}`);
export const getQuizSet = (setId) => api.get(`/quiz/sets/${setId}`);
export const submitQuiz = (setId, answers) => api.post(`/quiz/sets/${setId}/submit`, { answers });
