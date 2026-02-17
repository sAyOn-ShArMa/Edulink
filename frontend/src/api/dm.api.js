import api from './axios';

export const getAvailableTeachers = () => api.get('/dm/teachers');
export const getConversations = () => api.get('/dm/conversations');
export const startConversation = (data) => api.post('/dm/conversations', data);
export const getDmMessages = (conversationId, limit = 100, offset = 0) =>
  api.get(`/dm/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
export const sendDmMessage = (conversationId, content) =>
  api.post(`/dm/conversations/${conversationId}/messages`, { content });
export const askAiAssistant = (conversationId, question) =>
  api.post(`/dm/conversations/${conversationId}/ai-assist`, { question });
export const deleteConversation = (conversationId) =>
  api.delete(`/dm/conversations/${conversationId}`);
