import express from 'express';
import {
  createAnnouncement,
  getAnnouncementsForUser,
  getGlobalAnnouncements,
  getCourseAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsByAuthor
} from '../controllers/announcementController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all announcements for the current user (global + course-specific)
router.get('/', getAnnouncementsForUser);

// Get global announcements only
router.get('/global', getGlobalAnnouncements);

// Get announcements authored by the current user (teachers/admins only)
router.get('/authored', authorize('Teacher', 'Admin'), getAnnouncementsByAuthor);

// Create a new announcement (teachers and admins only)
router.post('/', authorize('Teacher', 'Admin'), createAnnouncement);

// Get announcements for a specific course
router.get('/course/:courseId', getCourseAnnouncements);

// Get, update, or delete a specific announcement
router.route('/:id')
  .get(getAnnouncementById)
  .put(authorize('Teacher', 'Admin'), updateAnnouncement)
  .delete(authorize('Teacher', 'Admin'), deleteAnnouncement);

export default router;