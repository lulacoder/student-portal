const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { generateToken } = require('../../utils/generateToken');
const userRoutes = require('../../routes/userRoutes');

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Routes Integration Tests', () => {
  let testUsers = {};
  let authTokens = {};

  beforeAll(async () => {
    // Create test users
    const studentUser = new User({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      role: 'Student',
      studentId: 'STU001'
    });
    await studentUser.save();
    testUsers.student = studentUser;
    authTokens.student = generateToken(studentUser._id, studentUser.role);

    const adminUser = new User({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'Admin'
    });
    await adminUser.save();
    testUsers.admin = adminUser;
    authTokens.admin = generateToken(adminUser._id, adminUser.role);
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({
      email: { $in: ['student@test.com', 'admin@test.com'] }
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('student@test.com');
      expect(response.body.data.role).toBe('Student');
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Student Name'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Student Name');
    });
  });

  describe('GET /api/users (Admin only)', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('POST /api/users (Admin only)', () => {
    it('should create new student user', async () => {
      const userData = {
        name: 'New Student',
        email: 'newstudent@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU002'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newstudent@test.com');
      expect(response.body.data.role).toBe('Student');
      expect(response.body.data.password).toBeUndefined();

      // Clean up
      await User.findByIdAndDelete(response.body.data._id);
    });

    it('should deny access to non-admin users', async () => {
      const userData = {
        name: 'Unauthorized User',
        email: 'unauthorized@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU004'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .send(userData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});