// @ts-nocheck
import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', register);
router.post('/login', login);

// Protected routes (authentication required)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;