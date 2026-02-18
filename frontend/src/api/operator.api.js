import api from './axios';

// User management
export const createUser = (email, password, full_name, role) =>
  api.post('/operator/users', { email, password, full_name, role });

export const listUsers = (role) =>
  api.get('/operator/users', { params: role ? { role } : {} });

export const deleteUser = (id) =>
  api.delete(`/operator/users/${id}`);

// Class management
export const createClass = (name, subject, teacher_id, section) =>
  api.post('/operator/classes', { name, subject, teacher_id, section });

export const deleteClass = (classId) =>
  api.delete(`/operator/classes/${classId}`);

export const assignTeacher = (classId, teacher_id) =>
  api.put(`/operator/classes/${classId}/teacher`, { teacher_id });

export const removeTeacher = (classId, teacherId) =>
  api.delete(`/operator/classes/${classId}/teacher/${teacherId}`);

export const getClassTeachers = (classId) =>
  api.get(`/operator/classes/${classId}/teachers`);

export const enrollStudent = (classId, student_id) =>
  api.post(`/operator/classes/${classId}/enroll`, { student_id });

export const unenrollStudent = (classId, studentId) =>
  api.delete(`/operator/classes/${classId}/enroll/${studentId}`);

export const getClassStudents = (classId) =>
  api.get(`/operator/classes/${classId}/students`);

// Stats
export const getStats = () =>
  api.get('/operator/stats');

// PDF management
export const downloadPdf = (pdfId) =>
  api.get(`/operator/pdf/download/${pdfId}`, { responseType: 'blob' });

export const uploadPdf = (formData) =>
  api.post('/operator/pdf/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
