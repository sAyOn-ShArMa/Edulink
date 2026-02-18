import api from './axios';

export const createClass = (name, subject) => api.post('/classes', { name, subject });
export const getMyClasses = () => api.get('/classes');
export const getAllClasses = () => api.get('/classes/all');
export const getSections = () => api.get('/classes/sections');
export const enrollInClass = (classId) => api.post(`/classes/${classId}/enroll`);
