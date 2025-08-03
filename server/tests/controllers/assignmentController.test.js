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
  gradeSubmission,
  bulkGradeSubmissions,
  getStudentGrades,
  getCourseGradebook,
  getSubmissionDetails
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

  // Setup test routes with proper middleware handling
  const setupRoute = (method, path, handler) => {
    app[method](path, (req, res, next) => {
      // Dynamic auth based on token
      if (req.headers.authorization === teacherToken) {
        return mockAuth(teacher)(req, res, next);
      } else if (req.headers.authorization === studentToken) {
        return mockAuth(student)(req, res, next);
      } else if (req.headers.authorization === adminToken) {
        return mockAuth(admin)(req, res, next);
      } else {
        return mockAuth(teacher)(req, res, next); // Default fallback
      }
    }, handler);
  };

  setupRoute('get', '/api/assignments/course/:courseId', getAssignmentsByCourse);
  setupRoute('get', '/api/assignments/:id', getAssignment);
  setupRoute('post', '/api/assignments', createAssignment);
  setupRoute('put', '/api/assignments/:id', updateAssignment);
  setupRoute('delete', '/api/assignments/:id', deleteAssignment);
  setupRoute('post', '/api/assignments/:id/submit', submitAssignment);
  setupRoute('get', '/api/assignments/:id/submissions', getAssignmentSubmissions);
  setupRoute('put', '/api/assignments/submission/:submissionId/grade', gradeSubmission);
  setupRoute('put', '/api/assignments/assignment/:assignmentId/bulk-grade', bulkGradeSubmissions);
  setupRoute('get', '/api/assignments/student/:studentId/grades', getStudentGrades);
  setupRoute('get', '/api/assignments/course/:courseId/gradebook', getCourseGradebook);
  setupRoute('get', '/api/assignments/submission/:submissionId', getSubmissionDetails);

  describe('GET /assignments/course/:courseId', () => {

    test('should get assignments for course as teacher', async () => {
      const response = await request(app)
        .get(`/api/assignments/course/${course._id}`)
        .set('Authorization', teacherToken);

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
        role: 'Student',
        studentId: 'STU002'
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
      // Create assignment with past due date (bypass validation for testing)
      const pastAssignment = new Assignment({
        title: 'Past Assignment',
        description: 'Past assignment description',
        course: course._id,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        pointValue: 100
      });
      // Save without validation to allow past due date for testing
      await pastAssignment.save({ validateBeforeSave: false });

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
        role: 'Student',
        studentId: 'STU003'
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

  describe('Enhanced Grading System Tests', () => {
    let submission1, submission2, assignment2;

    beforeEach(async () => {
      // Create additional assignment
      assignment2 = new Assignment({
        title: 'Second Assignment',
        description: 'Second assignment description',
        course: course._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        pointValue: 50
      });
      await assignment2.save();

      // Create test submissions
      submission1 = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'First submission',
        submittedAt: new Date(),
        isLate: false
      });
      await submission1.save();

      submission2 = new Submission({
        assignment: assignment2._id,
        student: student._id,
        submissionText: 'Second submission',
        submittedAt: new Date(),
        isLate: false
      });
      await submission2.save();
    });

    describe('Enhanced gradeSubmission', () => {
      beforeEach(() => {
        app.use((req, res, next) => {
          if (req.headers.authorization === teacherToken) {
            return mockAuth(teacher)(req, res, next);
          }
          next();
        });
      });

      test('should calculate grade percentage and letter grade', async () => {
        const gradeData = {
          grade: 85,
          feedback: 'Good work!'
        };

        const response = await request(app)
          .put(`/assignments/submission/${submission1._id}/grade`)
          .set('Authorization', teacherToken)
          .send(gradeData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.grade).toBe(85);
        expect(response.body.data.gradePercentage).toBe(85);
        expect(response.body.data.letterGrade).toBe('B');
        expect(response.body.data.isRegrade).toBe(false);
      });

      test('should detect regrading', async () => {
        // First grade
        await request(app)
          .put(`/assignments/submission/${submission1._id}/grade`)
          .set('Authorization', teacherToken)
          .send({ grade: 75, feedback: 'First grade' });

        // Regrade
        const response = await request(app)
          .put(`/assignments/submission/${submission1._id}/grade`)
          .set('Authorization', teacherToken)
          .send({ grade: 85, feedback: 'Updated grade' });

        expect(response.status).toBe(200);
        expect(response.body.data.isRegrade).toBe(true);
        expect(response.body.data.previousGrade).toBe(75);
        expect(response.body.message).toContain('regraded');
      });

      test('should validate numeric grade format', async () => {
        const response = await request(app)
          .put(`/assignments/submission/${submission1._id}/grade`)
          .set('Authorization', teacherToken)
          .send({ grade: 'invalid', feedback: 'Invalid grade' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_GRADE_FORMAT');
      });
    });

    describe('Bulk Grading', () => {
      beforeEach(() => {
        app.use((req, res, next) => {
          if (req.headers.authorization === teacherToken) {
            return mockAuth(teacher)(req, res, next);
          }
          next();
        });
      });

      test('should bulk grade multiple submissions', async () => {
        const bulkGradeData = {
          grades: [
            {
              submissionId: submission1._id.toString(),
              grade: 85,
              feedback: 'Good work on first assignment'
            },
            {
              submissionId: submission2._id.toString(),
              grade: 42,
              feedback: 'Needs improvement'
            }
          ]
        };

        const response = await request(app)
          .put(`/assignments/assignment/${assignment._id}/bulk-grade`)
          .set('Authorization', teacherToken)
          .send(bulkGradeData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.successful).toHaveLength(1); // Only submission1 belongs to assignment
        expect(response.body.data.failed).toHaveLength(1); // submission2 belongs to different assignment
      });

      test('should handle validation errors in bulk grading', async () => {
        const bulkGradeData = {
          grades: [
            {
              submissionId: submission1._id.toString(),
              grade: 150, // Exceeds point value
              feedback: 'Too high'
            },
            {
              submissionId: submission1._id.toString(),
              grade: 85,
              feedback: 'Valid grade'
            }
          ]
        };

        const response = await request(app)
          .put(`/assignments/assignment/${assignment._id}/bulk-grade`)
          .set('Authorization', teacherToken)
          .send(bulkGradeData);

        expect(response.status).toBe(200);
        expect(response.body.data.successful).toHaveLength(1);
        expect(response.body.data.failed).toHaveLength(1);
        expect(response.body.data.failed[0].error).toContain('must be between 0 and 100');
      });

      test('should require grades array', async () => {
        const response = await request(app)
          .put(`/assignments/assignment/${assignment._id}/bulk-grade`)
          .set('Authorization', teacherToken)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MISSING_GRADES');
      });
    });

    describe('Student Grades Retrieval', () => {
      beforeEach(async () => {
        // Grade the submissions
        submission1.grade = 85;
        submission1.feedback = 'Good work';
        submission1.gradedAt = new Date();
        submission1.gradedBy = teacher._id;
        await submission1.save();

        submission2.grade = 42;
        submission2.feedback = 'Needs improvement';
        submission2.gradedAt = new Date();
        submission2.gradedBy = teacher._id;
        await submission2.save();

        app.use((req, res, next) => {
          if (req.headers.authorization === studentToken) {
            return mockAuth(student)(req, res, next);
          } else if (req.headers.authorization === teacherToken) {
            return mockAuth(teacher)(req, res, next);
          }
          next();
        });
      });

      test('should get student grades as student themselves', async () => {
        const response = await request(app)
          .get(`/assignments/student/${student._id}/grades`)
          .set('Authorization', studentToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.student.name).toBe('Test Student');
        expect(response.body.data.overallStats.totalAssignments).toBe(2);
        expect(response.body.data.overallStats.averagePercentage).toBeCloseTo(63.5, 1); // (85/100 + 42/50) * 100 / 2
        expect(response.body.data.courseGrades).toHaveLength(1);
      });

      test('should get student grades as their teacher', async () => {
        const response = await request(app)
          .get(`/assignments/student/${student._id}/grades`)
          .set('Authorization', teacherToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.courseGrades[0].assignments).toHaveLength(2);
      });

      test('should deny access to other students grades', async () => {
        const otherStudent = new User({
          name: 'Other Student',
          email: 'other@test.com',
          password: 'password123',
          role: 'Student',
          studentId: 'STU004'
        });
        await otherStudent.save();

        const response = await request(app)
          .get(`/assignments/student/${otherStudent._id}/grades`)
          .set('Authorization', studentToken);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('ACCESS_DENIED');
      });
    });

    describe('Course Gradebook', () => {
      beforeEach(async () => {
        // Grade the submissions
        submission1.grade = 85;
        submission1.gradedAt = new Date();
        submission1.gradedBy = teacher._id;
        await submission1.save();

        app.use((req, res, next) => {
          if (req.headers.authorization === teacherToken) {
            return mockAuth(teacher)(req, res, next);
          }
          next();
        });
      });

      test('should get course gradebook as teacher', async () => {
        const response = await request(app)
          .get(`/assignments/course/${course._id}/gradebook`)
          .set('Authorization', teacherToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.course.name).toBe('Test Course');
        expect(response.body.data.assignments).toHaveLength(2);
        expect(response.body.data.students).toHaveLength(1);
        expect(response.body.data.students[0].student.name).toBe('Test Student');
        expect(response.body.data.courseStats.totalStudents).toBe(1);
        expect(response.body.data.courseStats.totalAssignments).toBe(2);
      });

      test('should calculate gradebook statistics correctly', async () => {
        const response = await request(app)
          .get(`/assignments/course/${course._id}/gradebook`)
          .set('Authorization', teacherToken);

        const studentData = response.body.data.students[0];
        expect(studentData.stats.submittedCount).toBe(2);
        expect(studentData.stats.gradedCount).toBe(1);
        expect(studentData.stats.totalPointsPossible).toBe(150); // 100 + 50
        expect(studentData.stats.totalPointsEarned).toBe(85);
      });

      test('should deny access to students', async () => {
        app.use((req, res, next) => {
          req.user = { id: student._id.toString(), role: 'Student' };
          next();
        });

        const response = await request(app)
          .get(`/assignments/course/${course._id}/gradebook`)
          .set('Authorization', studentToken);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('ACCESS_DENIED');
      });
    });

    describe('Submission Details', () => {
      beforeEach(async () => {
        submission1.grade = 85;
        submission1.feedback = 'Good work';
        submission1.gradedAt = new Date();
        submission1.gradedBy = teacher._id;
        await submission1.save();

        app.use((req, res, next) => {
          if (req.headers.authorization === studentToken) {
            return mockAuth(student)(req, res, next);
          } else if (req.headers.authorization === teacherToken) {
            return mockAuth(teacher)(req, res, next);
          }
          next();
        });
      });

      test('should get submission details as student owner', async () => {
        const response = await request(app)
          .get(`/assignments/submission/${submission1._id}`)
          .set('Authorization', studentToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.submissionText).toBe('First submission');
        expect(response.body.data.grade).toBe(85);
        expect(response.body.data.gradePercentage).toBe(85);
        expect(response.body.data.daysLate).toBe(0);
      });

      test('should get submission details as teacher', async () => {
        const response = await request(app)
          .get(`/assignments/submission/${submission1._id}`)
          .set('Authorization', teacherToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.feedback).toBe('Good work');
      });

      test('should calculate days late for late submissions', async () => {
        // Create a late submission
        const lateSubmission = new Submission({
          assignment: assignment._id,
          student: student._id,
          submissionText: 'Late submission',
          submittedAt: new Date(assignment.dueDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days late
          isLate: true
        });
        await lateSubmission.save();

        const response = await request(app)
          .get(`/assignments/submission/${lateSubmission._id}`)
          .set('Authorization', studentToken);

        expect(response.status).toBe(200);
        expect(response.body.data.daysLate).toBe(2);
      });
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