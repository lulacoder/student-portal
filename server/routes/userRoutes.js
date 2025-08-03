import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// User profile routes (accessible by authenticated users)
router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, updateUserProfile);

// Admin-only user management routes
router.get('/', authenticate, authorize('Admin'), getAllUsers);
router.get('/:id', authenticate, authorize('Admin'), getUserById);
router.post('/', authenticate, authorize('Admin'), createUser);
router.put('/:id', authenticate, authorize('Admin'), updateUser);
router.delete('/:id', authenticate, authorize('Admin'), deleteUser);

export default router;