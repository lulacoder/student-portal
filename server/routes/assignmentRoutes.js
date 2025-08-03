import express from 'express';
import {
  getAssignmentsByCourse,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  downloadFile
} from '../controllers/assignmentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { uploadMultiple, handleFileUploadError } from '../middleware/fileUpload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Assignment CRUD routes
router.get('/course/:courseId', getAssignmentsByCourse);
router.get('/:id', getAssignment);
router.post('/', uploadMultiple, handleFileUploadError, createAssignment);
router.put('/:id', uploadMultiple, handleFileUploadError, updateAssignment);
router.delete('/:id', deleteAssignment);

// Assignment submission routes
router.post('/:id/submit', uploadMultiple, handleFileUploadError, submitAssignment);
router.get('/:id/submissions', getAssignmentSubmissions);

// Grading routes
router.put('/submission/:submissionId/grade', gradeSubmission);

// File download route
router.get('/files/:fileId', downloadFile);

export default router;