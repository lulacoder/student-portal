const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { generateToken } = require('../../utils/generateToken');
const userRoutes = require('../../routes/userRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

// Test data
let testUsers = {};
let authTokens = {};

describe('User Management API', () => {
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

    const teacherUser = new User({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });
    await teacherUser.save();
    testUsers.teacher = teacherUser;
    authTokens.teacher = generateToken(teacherUser._id, teacherUser.role);

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
      email: { $in: ['student@test.com', 'teacher@test.com', 'admin@test.com', 'newuser@test.com'] }
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
        name: 'Updated Student Name',
        studentId: 'STU001-UPDATED'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Student Name');
      expect(response.body.data.studentId).toBe('STU001-UPDATED');
    });

    it('should update password with valid current password', async () => {
      const updateData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authTokens.teacher}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should reject password update with invalid current password', async () => {
      const updateData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authTokens.teacher}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should reject duplicate email', async () => {
      const updateData = {
        email: 'admin@test.com' // Already exists
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });  describe
('GET /api/users (Admin only)', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalUsers).toBeGreaterThanOrEqual(3);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=Student')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(user => {
        expect(user.role).toBe('Student');
      });
    });

    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users?search=Student')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.currentPage).toBe(1);
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

  describe('GET /api/users/:id (Admin only)', () => {
    it('should get user by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${testUsers.student._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testUsers.student._id.toString());
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_USER_ID');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get(`/api/users/${testUsers.student._id}`)
        .set('Authorization', `Bearer ${authTokens.teacher}`)
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
      expect(response.body.data.studentId).toBe('STU002');
      expect(response.body.data.password).toBeUndefined();

      // Clean up
      await User.findByIdAndDelete(response.body.data._id);
    });

    it('should create new teacher user', async () => {
      const userData = {
        name: 'New Teacher',
        email: 'newteacher@test.com',
        password: 'password123',
        role: 'Teacher',
        teacherCredentials: 'MSc in Mathematics'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newteacher@test.com');
      expect(response.body.data.role).toBe('Teacher');
      expect(response.body.data.teacherCredentials).toBe('MSc in Mathematics');

      // Clean up
      await User.findByIdAndDelete(response.body.data._id);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'student@test.com', // Already exists
        password: 'password123',
        role: 'Student',
        studentId: 'STU003'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should require studentId for Student role', async () => {
      const userData = {
        name: 'Student Without ID',
        email: 'nostudentid@test.com',
        password: 'password123',
        role: 'Student'
        // Missing studentId
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_ID_REQUIRED');
    });

    it('should require teacherCredentials for Teacher role', async () => {
      const userData = {
        name: 'Teacher Without Credentials',
        email: 'nocredentials@test.com',
        password: 'password123',
        role: 'Teacher'
        // Missing teacherCredentials
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TEACHER_CREDENTIALS_REQUIRED');
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

  describe('PUT /api/users/:id (Admin only)', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Teacher Name',
        teacherCredentials: 'PhD in Physics'
      };

      const response = await request(app)
        .put(`/api/users/${testUsers.teacher._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Teacher Name');
      expect(response.body.data.teacherCredentials).toBe('PhD in Physics');
    });

    it('should change user role and clear role-specific fields', async () => {
      // Create a temporary student to test role change
      const tempStudent = new User({
        name: 'Temp Student',
        email: 'tempstudent@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'TEMP001'
      });
      await tempStudent.save();

      const updateData = {
        role: 'Teacher',
        teacherCredentials: 'New Teacher Credentials'
      };

      const response = await request(app)
        .put(`/api/users/${tempStudent._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('Teacher');
      expect(response.body.data.teacherCredentials).toBe('New Teacher Credentials');
      expect(response.body.data.studentId).toBeUndefined();

      // Clean up
      await User.findByIdAndDelete(tempStudent._id);
    });

    it('should deactivate user', async () => {
      // Create a temporary user to deactivate
      const tempUser = new User({
        name: 'Temp User',
        email: 'tempuser@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'TEMP002'
      });
      await tempUser.save();

      const updateData = {
        isActive: false
      };

      const response = await request(app)
        .put(`/api/users/${tempUser._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);

      // Clean up
      await User.findByIdAndDelete(tempUser._id);
    });

    it('should reject duplicate email', async () => {
      const updateData = {
        email: 'admin@test.com' // Already exists
      };

      const response = await request(app)
        .put(`/api/users/${testUsers.student._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should deny access to non-admin users', async () => {
      const updateData = { name: 'Unauthorized Update' };

      const response = await request(app)
        .put(`/api/users/${testUsers.student._id}`)
        .set('Authorization', `Bearer ${authTokens.teacher}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('DELETE /api/users/:id (Admin only)', () => {
    it('should soft delete user successfully', async () => {
      // Create a temporary user to delete
      const tempUser = new User({
        name: 'User To Delete',
        email: 'todelete@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'DEL001'
      });
      await tempUser.save();

      const response = await request(app)
        .delete(`/api/users/${tempUser._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is soft deleted
      const deletedUser = await User.findById(tempUser._id);
      expect(deletedUser.isActive).toBe(false);

      // Clean up
      await User.findByIdAndDelete(tempUser._id);
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUsers.admin._id}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CANNOT_DELETE_SELF');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .delete('/api/users/invalid-id')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_USER_ID');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUsers.student._id}`)
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});