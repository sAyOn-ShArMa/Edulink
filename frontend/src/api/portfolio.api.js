import api from './axios';

export const getPortfolio = (studentId) => api.get(`/portfolio/${studentId}`);
export const updatePortfolio = (data) => api.put('/portfolio', data);
