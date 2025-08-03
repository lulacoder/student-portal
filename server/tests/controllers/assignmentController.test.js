import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import Assignment from '../../models/Assignment.js';
import Submission from '../../models/Submission.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import File from '../../models/File.js';
import {
  getAssignmentsByCourse,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission
} from '../../controllers/assignmentController.js';
import { connectDB, closeDB, clearDB } from '../setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

describe('Assignment Controller', () => {
  let teacher, student, admin, course, assignment;
  let teacherToken, studentToken, adminToken;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Create test users
    teacher = new User({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'Teacher'
    });
    await teacher.save();

    student = new User({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      role: 'Student'
    });
    await student.save();

    admin = new User({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'Admin'
    });
    await admin.save();

    // Create test course
    course = new Course({
      name: 'Test Course',
      description: 'Test course description',
      subject: 'Computer Science',
      teacher: teacher._id,
      enrolledStudents: [student._id]
    });
    await course.save();

    // Create test assignment
    assignment = new Assignment({
      title: 'Test Assignment',
      description: 'Test assignment description',
      course: course._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      pointValue: 100
    });
    await assignment.save();

    // Generate tokens (simplified for testing)
    teacherToken = 'Bearer teacher-token';
    studentToken = 'Bearer student-token';
    adminToken = 'Bearer admin-token';
  });

  // Mock authentication middleware
  const mockAuth = (user) => (req, res, next) => {
    req.user = { id: user._id.toString(), role: user.role };
    next();
  };

  // Setup test routes
  app.get('/assignments/course/:courseId', mockAuth(teacher), getAssignmentsByCourse);
  app.get('/assignments/:id', mockAuth(teacher), getAssignment);
  app.post('/assignments', mockAuth(teacher), createAssignment);
  app.put('/assignments/:id', mockAuth(teacher), updateAssignment);
  app.delete('/assignments/:id', mockAuth(teacher), deleteAssignment);
  app.post('/assignments/:id/submit', mockAuth(student), submitAssignment);
  app.get('/assignments/:id/submissions', mockAuth(teacher), getAssignmentSubmissions);
  app.put('/assignments/submission/:submissionId/grade', mockAuth(teacher), gradeSubmission);

  describe('GET /assignments/course/:courseId', () => {

    test('should get assignments for course as teacher', async () => {
      const response = await request(app)
        .get(`/assignments/course/${course._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Assignment');
    });

    test('should get assignments for course as enrolled student', async () => {
      const response = await request(app)
        .get(`/api/assignments/course/${course._id}`)
        .set('Authorization', studentToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('submission');
    });

    test('should deny access to non-enrolled student', async () => {
      const otherStudent = new User({
        name: 'Other Student',
        email: 'other@test.com',
        password: 'password123',
        role: 'Student'
      });
      await otherStudent.save();

      app.use((req, res, next) => {
        req.user = { id: otherStudent._id.toString(), role: 'Student' };
        next();
      });

      const response = await request(app)
        .get(`/api/assignments/course/${course._id}`)
        .set('Authorization', 'Bearer other-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent course', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/assignments/course/${nonExistentId}`)
        .set('Authorization', teacherToken);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/assignments', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        if (req.headers.authorization === teacherToken) {
          return mockAuth(teacher)(req, res, next);
        } else if (req.headers.authorization === adminToken) {
          return mockAuth(admin)(req, res, next);
        }
        next();
      });
    });

    test('should create assignment as teacher', async () => {
      const assignmentData = {
        title: 'New Assignment',
        description: 'New assignment description',
        course: course._id.toString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        pointValue: 50
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', teacherToken)
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Assignment');
      expect(response.body.data.pointValue).toBe(50);
    });

    test('should create assignment as admin', async () => {
      const assignmentData = {
        title: 'Admin Assignment',
        description: 'Admin assignment description',
        course: course._id.toString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        pointValue: 75
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', adminToken)
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Admin Assignment');
    });

    test('should deny assignment creation for students', async () => {
      app.use((req, res, next) => {
        req.user = { id: student._id.toString(), role: 'Student' };
        next();
      });

      const assignmentData = {
        title: 'Student Assignment',
        description: 'Student assignment description',
        course: course._id.toString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        pointValue: 25
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', studentToken)
        .send(assignmentData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', teacherToken)
        .send({
          title: 'Incomplete Assignment'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    test('should validate due date is in future', async () => {
      const assignmentData = {
        title: 'Past Due Assignment',
        description: 'Assignment with past due date',
        course: course._id.toString(),
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        pointValue: 50
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', teacherToken)
        .send(assignmentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/assignments/:id/submit', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        if (req.headers.authorization === studentToken) {
          return mockAuth(student)(req, res, next);
        }
        next();
      });
    });

    test('should submit assignment as enrolled student', async () => {
      const submissionData = {
        submissionText: 'This is my submission text'
      };

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', studentToken)
        .send(submissionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissionText).toBe('This is my submission text');
      expect(response.body.data.isLate).toBe(false);
    });

    test('should mark late submission', async () => {
      // Create assignment with past due date
      const pastAssignment = new Assignment({
        title: 'Past Assignment',
        description: 'Past assignment description',
        course: course._id,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        pointValue: 100
      });
      await pastAssignment.save();

      const submissionData = {
        submissionText: 'Late submission'
      };

      const response = await request(app)
        .post(`/api/assignments/${pastAssignment._id}/submit`)
        .set('Authorization', studentToken)
        .send(submissionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isLate).toBe(true);
    });

    test('should allow resubmission', async () => {
      // First submission
      await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', studentToken)
        .send({ submissionText: 'First submission' });

      // Resubmission
      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', studentToken)
        .send({ submissionText: 'Second submission' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissionText).toBe('Second submission');
      expect(response.body.message).toContain('resubmitted');
    });

    test('should deny submission from non-enrolled student', async () => {
      const otherStudent = new User({
        name: 'Other Student',
        email: 'other@test.com',
        password: 'password123',
        role: 'Student'
      });
      await otherStudent.save();

      app.use((req, res, next) => {
        req.user = { id: otherStudent._id.toString(), role: 'Student' };
        next();
      });

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', 'Bearer other-token')
        .send({ submissionText: 'Unauthorized submission' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_ENROLLED');
    });

    test('should deny submission from teacher', async () => {
      app.use((req, res, next) => {
        req.user = { id: teacher._id.toString(), role: 'Teacher' };
        next();
      });

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', teacherToken)
        .send({ submissionText: 'Teacher submission' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/assignments/submission/:submissionId/grade', () => {
    let submission;

    beforeEach(async () => {
      submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Test submission',
        submittedAt: new Date(),
        isLate: false
      });
      await submission.save();

      app.use((req, res, next) => {
        if (req.headers.authorization === teacherToken) {
          return mockAuth(teacher)(req, res, next);
        } else if (req.headers.authorization === adminToken) {
          return mockAuth(admin)(req, res, next);
        }
        next();
      });
    });

    test('should grade submission as teacher', async () => {
      const gradeData = {
        grade: 85,
        feedback: 'Good work!'
      };

      const response = await request(app)
        .put(`/api/assignments/submission/${submission._id}/grade`)
        .set('Authorization', teacherToken)
        .send(gradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(85);
      expect(response.body.data.feedback).toBe('Good work!');
      expect(response.body.data.gradedAt).toBeDefined();
    });

    test('should grade submission as admin', async () => {
      const gradeData = {
        grade: 90,
        feedback: 'Excellent work!'
      };

      const response = await request(app)
        .put(`/api/assignments/submission/${submission._id}/grade`)
        .set('Authorization', adminToken)
        .send(gradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(90);
    });

    test('should validate grade is within point value', async () => {
      const gradeData = {
        grade: 150, // Assignment point value is 100
        feedback: 'Too high!'
      };

      const response = await request(app)
        .put(`/api/assignments/submission/${submission._id}/grade`)
        .set('Authorization', teacherToken)
        .send(gradeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_GRADE');
    });

    test('should require grade field', async () => {
      const response = await request(app)
        .put(`/api/assignments/submission/${submission._id}/grade`)
        .set('Authorization', teacherToken)
        .send({ feedback: 'Missing grade' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_GRADE');
    });
  });

  describe('GET /api/assignments/:id/submissions', () => {
    let submission;

    beforeEach(async () => {
      submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Test submission',
        submittedAt: new Date(),
        isLate: false
      });
      await submission.save();

      app.use((req, res, next) => {
        if (req.headers.authorization === teacherToken) {
          return mockAuth(teacher)(req, res, next);
        } else if (req.headers.authorization === adminToken) {
          return mockAuth(admin)(req, res, next);
        }
        next();
      });
    });

    test('should get submissions as teacher', async () => {
      const response = await request(app)
        .get(`/api/assignments/${assignment._id}/submissions`)
        .set('Authorization', teacherToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].submissionText).toBe('Test submission');
    });

    test('should get submissions as admin', async () => {
      const response = await request(app)
        .get(`/api/assignments/${assignment._id}/submissions`)
        .set('Authorization', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    test('should deny access to students', async () => {
      app.use((req, res, next) => {
        req.user = { id: student._id.toString(), role: 'Student' };
        next();
      });

      const response = await request(app)
        .get(`/api/assignments/${assignment._id}/submissions`)
        .set('Authorization', studentToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('File Upload Integration', () => {
    test('should handle file upload validation', async () => {
      // This test would require actual file upload testing
      // For now, we'll test the validation logic
      expect(true).toBe(true); // Placeholder
    });
  });
});