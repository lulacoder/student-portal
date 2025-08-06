import api from './api.js';

// Get assignments for a specific course
export const getAssignmentsByCourse = async (courseId) => {
  const response = await api.get(`/assignments/course/${courseId}`);
  return response.data;
};

// Get single assignment details
export const getAssignment = async (assignmentId) => {
  const response = await api.get(`/assignments/${assignmentId}`);
  return response.data;
};

// Submit assignment
export const submitAssignment = async (assignmentId, formData) => {
  const response = await api.post(`/assignments/${assignmentId}/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get submission details
export const getSubmissionDetails = async (submissionId) => {
  const response = await api.get(`/assignments/submission/${submissionId}`);
  return response.data;
};

// Download file
export const downloadFile = async (fileId) => {
  const response = await api.get(`/assignments/files/${fileId}`, {
    responseType: 'blob',
  });
  return response;
};

// Get student grades
export const getStudentGrades = async (studentId) => {
  const response = await api.get(`/assignments/student/${studentId}/grades`);
  return response.data;
};