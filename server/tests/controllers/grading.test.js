import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

import Assignment from '../../models/Assignment.js';
import Submission from '../../models/Submission.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import {
  gradeSubmission,
  bulkGradeSubmissions,
  getStudentGrades,
  getCourseGradebook,
  getSubmissionDetails
} from '../../controllers/assignmentController.js';
import { connectDB, closeDB, clearDB } from '../setup.js';

const app = express();
app.use(express.json());

describe('Grading System', () => {
  let teacher, student, admin, course, assignment, submission;

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

    // Create test submission
    submission = new Submission({
      assignment: assignment._id,
      student: student._id,
      submissionText: 'Test submission',
      submittedAt: new Date(),
      isLate: false
    });
    await submission.save();
  });

  // Mock authentication middleware
  const mockAuth = (user) => (req, res, next) => {
    req.user = { id: user._id.toString(), role: user.role };
    next();
  };

  describe('Grade Submission', () => {
    beforeEach(() => {
      app.put('/grade/:submissionId', mockAuth(teacher), gradeSubmission);
    });

    test('should grade submission successfully', async () => {
      const gradeData = {
        grade: 85,
        feedback: 'Good work!'
      };

      const response = await request(app)
        .put(`/grade/${submission._id}`)
        .send(gradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(85);
      expect(response.body.data.feedback).toBe('Good work!');
      expect(response.body.data.gradePercentage).toBe(85);
      expect(response.body.data.letterGrade).toBe('B');
    });

    test('should validate grade range', async () => {
      // Ensure the submission is properly linked to assignment and course
      await submission.populate({
        path: 'assignment',
        populate: {
          path: 'course',
          select: 'teacher'
        }
      });

      const gradeData = {
        grade: 150, // Exceeds point value
        feedback: 'Too high'
      };

      const response = await request(app)
        .put(`/grade/${submission._id}`)
        .send(gradeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_GRADE_RANGE');
    });

    test('should require grade field', async () => {
      const response = await request(app)
        .put(`/grade/${submission._id}`)
        .send({ feedback: 'Missing grade' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_GRADE');
    });
  });

  describe('Student Grades', () => {
    beforeEach(async () => {
      // Grade the submission
      submission.grade = 85;
      submission.feedback = 'Good work';
      submission.gradedAt = new Date();
      submission.gradedBy = teacher._id;
      await submission.save();

      app.get('/student/:studentId/grades', mockAuth(student), getStudentGrades);
    });

    test('should get student grades', async () => {
      const response = await request(app)
        .get(`/student/${student._id}/grades`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.student.name).toBe('Test Student');
      expect(response.body.data.overallStats.totalAssignments).toBe(1);
      expect(response.body.data.courseGrades).toHaveLength(1);
    });
  });

  describe('Course Gradebook', () => {
    beforeEach(async () => {
      // Grade the submission
      submission.grade = 85;
      submission.gradedAt = new Date();
      submission.gradedBy = teacher._id;
      await submission.save();

      app.get('/gradebook/:courseId', mockAuth(teacher), getCourseGradebook);
    });

    test('should get course gradebook', async () => {
      const response = await request(app)
        .get(`/gradebook/${course._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.course.name).toBe('Test Course');
      expect(response.body.data.assignments).toHaveLength(1);
      expect(response.body.data.students).toHaveLength(1);
    });
  });

  describe('Submission Details', () => {
    beforeEach(async () => {
      submission.grade = 85;
      submission.feedback = 'Good work';
      submission.gradedAt = new Date();
      submission.gradedBy = teacher._id;
      await submission.save();

      app.get('/submission/:submissionId', mockAuth(student), getSubmissionDetails);
    });

    test('should get submission details', async () => {
      const response = await request(app)
        .get(`/submission/${submission._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(85);
      expect(response.body.data.gradePercentage).toBe(85);
      expect(response.body.data.feedback).toBe('Good work');
    });
  });

  describe('Bulk Grading', () => {
    let submission2;

    beforeEach(async () => {
      // Create second submission
      submission2 = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Second submission',
        submittedAt: new Date(),
        isLate: false
      });
      // Remove the unique constraint temporarily for testing
      await Submission.collection.dropIndex('assignment_1_student_1');
      await submission2.save();

      app.put('/bulk-grade/:assignmentId', mockAuth(teacher), bulkGradeSubmissions);
    });

    test('should bulk grade submissions', async () => {
      const bulkGradeData = {
        grades: [
          {
            submissionId: submission._id.toString(),
            grade: 85,
            feedback: 'Good work'
          },
          {
            submissionId: submission2._id.toString(),
            grade: 90,
            feedback: 'Excellent'
          }
        ]
      };

      const response = await request(app)
        .put(`/bulk-grade/${assignment._id}`)
        .send(bulkGradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toHaveLength(2);
      expect(response.body.data.failed).toHaveLength(0);
    });
  });
});