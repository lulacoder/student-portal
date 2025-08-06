import api from './api';

/**
 * Course service functions for API communication
 */

// Get enrolled courses for current user
export const getEnrolledCourses = async () => {
  try {
    const response = await api.get('/courses');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch enrolled courses' };
  }
};

// Get available courses for enrollment (students only)
export const getAvailableCourses = async () => {
  try {
    const response = await api.get('/courses/available');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch available courses' };
  }
};

// Get single course details
export const getCourse = async (courseId) => {
  try {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch course details' };
  }
};

// Enroll in a course
export const enrollInCourse = async (courseId) => {
  try {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to enroll in course' };
  }
};

// Unenroll from a course
export const unenrollFromCourse = async (courseId) => {
  try {
    const response = await api.delete(`/courses/${courseId}/enroll`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to unenroll from course' };
  }
};