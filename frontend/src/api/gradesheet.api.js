import api from './axios';

export const uploadGradesheet = (formData) => api.post('/gradesheet/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getGradesheet = (studentId) => api.get(`/gradesheet/${studentId}`);
export const analyzeGradesheet = () => api.post('/gradesheet/analyze');
export const getSchedule = (studentId) => api.get(`/gradesheet/schedule/${studentId}`);
