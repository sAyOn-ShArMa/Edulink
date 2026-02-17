import api from './axios';

export const generateFlashcards = (pdfBookId, scope, unitNumber, chapterTitle) =>
  api.post('/flashcards/generate', { pdfBookId, scope, unitNumber, chapterTitle });
export const getFlashcardSets = (classId) => api.get(`/flashcards/sets?classId=${classId}`);
export const getFlashcardSet = (setId) => api.get(`/flashcards/sets/${setId}`);
export const getBookStructure = (classId) => api.get(`/flashcards/books/${classId}`);
