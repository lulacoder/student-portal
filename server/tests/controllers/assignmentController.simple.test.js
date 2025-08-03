import mongoose from 'mongoose';
import Assignment from '../../models/Assignment.js';
import Submission from '../../models/Submission.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import File from '../../models/File.js';
import { connectDB, closeDB, clearDB } from '../setup.js';

describe('Assignment System - Core Functionality', () => {
  let teacher, student, admin, course, assignment;

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
  });

  describe('Assignment Model', () => {
    test('should create assignment with valid data', async () => {
      const newAssignment = new Assignment({
        title: 'New Assignment',
        description: 'New assignment description',
        course: course._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        pointValue: 50
      });

      const savedAssignment = await newAssignment.save();
      expect(savedAssignment.title).toBe('New Assignment');
      expect(savedAssignment.pointValue).toBe(50);
      expect(savedAssignment.isActive).toBe(true);
    });

    test('should validate required fields', async () => {
      const invalidAssignment = new Assignment({
        title: 'Incomplete Assignment'
        // Missing required fields
      });

      await expect(invalidAssignment.save()).rejects.toThrow();
    });

    test('should validate due date is in future for new assignments', async () => {
      const pastAssignment = new Assignment({
        title: 'Past Assignment',
        description: 'Assignment with past due date',
        course: course._id,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        pointValue: 50
      });

      await expect(pastAssignment.save()).rejects.toThrow();
    });

    test('should check if assignment accepts submissions', () => {
      expect(assignment.acceptsSubmissions()).toBe(true);

      // Test with inactive assignment
      assignment.isActive = false;
      expect(assignment.acceptsSubmissions()).toBe(false);
    });

    test('should calculate virtual properties correctly', () => {
      expect(assignment.isOverdue).toBe(false);
      expect(assignment.daysUntilDue).toBeGreaterThan(0);
    });
  });

  describe('Submission Model', () => {
    test('should create submission with valid data', async () => {
      const submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'This is my submission',
        submittedAt: new Date(),
        isLate: false
      });

      const savedSubmission = await submission.save();
      expect(savedSubmission.submissionText).toBe('This is my submission');
      expect(savedSubmission.isLate).toBe(false);
    });

    test('should set isLate flag based on due date', async () => {
      // Create assignment with future due date first, then update to past
      const pastAssignment = new Assignment({
        title: 'Past Assignment',
        description: 'Past assignment description',
        course: course._id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow initially
        pointValue: 100
      });
      await pastAssignment.save();

      // Update to past due date (bypassing validation for existing assignment)
      pastAssignment.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await pastAssignment.save();

      const lateSubmission = new Submission({
        assignment: pastAssignment._id,
        student: student._id,
        submissionText: 'Late submission',
        submittedAt: new Date()
      });

      const savedSubmission = await lateSubmission.save();
      expect(savedSubmission.isLate).toBe(true);
    });

    test('should validate student role', async () => {
      const invalidSubmission = new Submission({
        assignment: assignment._id,
        student: teacher._id, // Teacher trying to submit as student
        submissionText: 'Invalid submission'
      });

      await expect(invalidSubmission.save()).rejects.toThrow();
    });

    test('should enforce unique submission per student per assignment', async () => {
      const submission1 = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'First submission'
      });
      await submission1.save();

      const submission2 = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Duplicate submission'
      });

      await expect(submission2.save()).rejects.toThrow();
    });

    test('should calculate grade percentage correctly', async () => {
      const submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Graded submission',
        grade: 85
      });
      await submission.save();

      const percentage = await submission.getGradePercentage();
      expect(percentage).toBe(85); // 85/100 * 100 = 85%
    });

    test('should set gradedAt when grade is added', async () => {
      const submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'To be graded'
      });
      await submission.save();

      expect(submission.gradedAt).toBeUndefined();

      submission.grade = 90;
      await submission.save();

      expect(submission.gradedAt).toBeDefined();
      expect(submission.isGraded).toBe(true);
    });
  });

  describe('File Model', () => {
    test('should create file with valid data', async () => {
      const file = new File({
        originalName: 'test.pdf',
        filename: 'unique-filename.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/unique-filename.pdf',
        uploadedBy: teacher._id
      });

      const savedFile = await file.save();
      expect(savedFile.originalName).toBe('test.pdf');
      expect(savedFile.mimetype).toBe('application/pdf');
    });

    test('should validate allowed file types', async () => {
      const invalidFile = new File({
        originalName: 'malware.exe',
        filename: 'malware.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        path: '/uploads/malware.exe',
        uploadedBy: teacher._id
      });

      await expect(invalidFile.save()).rejects.toThrow();
    });

    test('should validate file size limit', async () => {
      const largeFile = new File({
        originalName: 'large.pdf',
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        size: 51 * 1024 * 1024, // 51MB - exceeds 50MB limit
        path: '/uploads/large.pdf',
        uploadedBy: teacher._id
      });

      await expect(largeFile.save()).rejects.toThrow();
    });
  });

  describe('Assignment with File Attachments', () => {
    test('should create assignment with file attachments', async () => {
      const file = new File({
        originalName: 'assignment-instructions.pdf',
        filename: 'unique-instructions.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        path: '/uploads/unique-instructions.pdf',
        uploadedBy: teacher._id
      });
      await file.save();

      const assignmentWithFile = new Assignment({
        title: 'Assignment with Files',
        description: 'Assignment with file attachments',
        course: course._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        pointValue: 75,
        attachments: [{
          name: 'Instructions',
          fileId: file._id
        }]
      });

      const savedAssignment = await assignmentWithFile.save();
      expect(savedAssignment.attachments).toHaveLength(1);
      expect(savedAssignment.attachments[0].name).toBe('Instructions');
    });
  });

  describe('Submission with File Attachments', () => {
    test('should create submission with file attachments', async () => {
      const file = new File({
        originalName: 'student-work.docx',
        filename: 'unique-work.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536,
        path: '/uploads/unique-work.docx',
        uploadedBy: student._id
      });
      await file.save();

      const submissionWithFile = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Please see attached file',
        attachments: [{
          name: 'My Work',
          fileId: file._id
        }]
      });

      const savedSubmission = await submissionWithFile.save();
      expect(savedSubmission.attachments).toHaveLength(1);
      expect(savedSubmission.attachments[0].name).toBe('My Work');
    });
  });

  describe('Database Queries and Indexes', () => {
    test('should efficiently query assignments by course', async () => {
      const assignments = await Assignment.find({ 
        course: course._id, 
        isActive: true 
      }).sort({ dueDate: 1 });

      expect(assignments).toHaveLength(1);
      expect(assignments[0].title).toBe('Test Assignment');
    });

    test('should efficiently query submissions by assignment', async () => {
      const submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Test submission'
      });
      await submission.save();

      const submissions = await Submission.find({ assignment: assignment._id })
        .populate('student', 'name email')
        .sort({ submittedAt: -1 });

      expect(submissions).toHaveLength(1);
      expect(submissions[0].student.name).toBe('Test Student');
    });

    test('should efficiently query submissions by student', async () => {
      const submission = new Submission({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Test submission'
      });
      await submission.save();

      const submissions = await Submission.find({ student: student._id })
        .populate('assignment', 'title dueDate')
        .sort({ submittedAt: -1 });

      expect(submissions).toHaveLength(1);
      expect(submissions[0].assignment.title).toBe('Test Assignment');
    });
  });
});