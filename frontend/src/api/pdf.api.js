import api from './axios';

export const uploadPdf = (formData) => api.post('/pdf/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getPdfs = (classId) => api.get(`/pdf/${classId}`);
export const getPdfContent = (pdfId) => api.get(`/pdf/content/${pdfId}`);
export const deletePdf = (pdfId) => api.delete(`/pdf/${pdfId}`);
export const downloadPdf = (pdfId) => api.get(`/pdf/download/${pdfId}`, { responseType: 'blob' });
