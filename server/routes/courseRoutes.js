import express from 'express';
import {
  getCourses,
  getAvailableCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
  manageEnrollment
} from '../controllers/courseController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get courses (role-based filtering)
router.get('/', getCourses);

// Get available courses for enrollment (Students only)
router.get('/available', authorize('Student'), getAvailableCourses);

// Get single course
router.get('/:id', getCourse);

// Create course (Teachers and Admins only)
router.post('/', authorize('Teacher', 'Admin'), createCourse);

// Update course (Course teacher and Admins only)
router.put('/:id', authorize('Teacher', 'Admin'), updateCourse);

// Delete course (Course teacher and Admins only)
router.delete('/:id', authorize('Teacher', 'Admin'), deleteCourse);

// Student enrollment routes
router.post('/:id/enroll', authorize('Student'), enrollInCourse);
router.delete('/:id/enroll', authorize('Student'), unenrollFromCourse);

// Manage student enrollment (Teachers and Admins only)
router.post('/:id/manage-enrollment', authorize('Teacher', 'Admin'), manageEnrollment);

export default router;