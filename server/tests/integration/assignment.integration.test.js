import request from 'supertest';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import Assignment from '../../models/Assignment.js';
import Submission from '../../models/Submission.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import File from '../../models/File.js';
import assignmentRoutes from '../../routes/assignmentRoutes.js';
import { connectDB, closeDB, clearDB } from '../setup.js';
import { generateToken } from '../../utils/generateToken.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/assignments', assignmentRoutes);

describe('Assignment Integration Tests', () => {
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
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });
    await teacher.save();

    student = new User({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      role: 'Student',
      studentId: 'STU001'
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

    // Generate tokens
    teacherToken = generateToken(teacher._id, teacher.role);
    studentToken = generateToken(student._id, student.role);
    adminToken = generateToken(admin._id, admin.role);
  });

  describe('GET /api/assignments/course/:courseId', () => {
    test('should get assignments for course as teacher', async () => {
      const response = await request(app)
        .get(`/api/assignments/course/${course._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Assignment');
    });

    test('should get assignments for course as enrolled student', async () => {
      const response = await request(app)
        .get(`/api/assignments/course/${course._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('submission');
    });

    test('should deny access without authentication', async () => {
      const response = await request(app)
        .get(`/api/assignments/course/${course._id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/assignments', () => {
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
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Assignment');
      expect(response.body.data.pointValue).toBe(50);
    });

    test('should deny assignment creation for students', async () => {
      const assignmentData = {
        title: 'Student Assignment',
        description: 'Student assignment description',
        course: course._id.toString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        pointValue: 25
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(assignmentData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/assignments/:id/submit', () => {
    test('should submit assignment as enrolled student', async () => {
      const submissionData = {
        submissionText: 'This is my submission text'
      };

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submissionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissionText).toBe('This is my submission text');
      expect(response.body.data.isLate).toBe(false);
    });

    test('should deny submission from teacher', async () => {
      const submissionData = {
        submissionText: 'Teacher submission'
      };

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(submissionData);

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
    });

    test('should grade submission as teacher', async () => {
      const gradeData = {
        grade: 85,
        feedback: 'Good work!'
      };

      const response = await request(app)
        .put(`/api/assignments/submission/${submission._id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(gradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(85);
      expect(response.body.data.feedback).toBe('Good work!');
      expect(response.body.data.gradedAt).toBeDefined();
    });

    test('should validate grade is within point value', async () => {
      const gradeData = {
        grade: 150, // Assignment point value is 100
        feedback: 'Too high!'
      };

      const response = await request(app)
        .put(`/api/assignments/submission/${submission._id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(gradeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_GRADE');
    });
  });

  describe('File Upload Integration', () => {
    const testFilesDir = path.join(__dirname, 'test-files');
    const validPdfPath = path.join(testFilesDir, 'test.pdf');

    beforeAll(() => {
      // Create test files directory
      if (!fs.existsSync(testFilesDir)) {
        fs.mkdirSync(testFilesDir, { recursive: true });
      }

      // Create test file
      fs.writeFileSync(validPdfPath, Buffer.from('%PDF-1.4\n%test pdf content'));
    });

    afterAll(() => {
      // Clean up test files
      if (fs.existsSync(testFilesDir)) {
        fs.rmSync(testFilesDir, { recursive: true, force: true });
      }
    });

    test('should create assignment with file attachment', async () => {
      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('title', 'Assignment with File')
        .field('description', 'Assignment with file attachment')
        .field('course', course._id.toString())
        .field('dueDate', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
        .field('pointValue', '75')
        .attach('files', validPdfPath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.attachments).toHaveLength(1);
      expect(response.body.data.attachments[0].name).toBe('test.pdf');
    });

    test('should submit assignment with file attachment', async () => {
      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .field('submissionText', 'Please see attached file')
        .attach('files', validPdfPath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.attachments).toHaveLength(1);
      expect(response.body.data.attachments[0].name).toBe('test.pdf');
    });
  });
});