const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Submission = require('../../models/Submission');
const Assignment = require('../../models/Assignment');
const Course = require('../../models/Course');
const User = require('../../models/User');
const File = require('../../models/File');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Submission.deleteMany({});
  await Assignment.deleteMany({});
  await Course.deleteMany({});
  await User.deleteMany({});
  await File.deleteMany({});
});

describe('Submission Model', () => {
  let teacher, student, course, assignment;

  beforeEach(async () => {
    teacher = await User.create({
      name: 'Teacher User',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });

    student = await User.create({
      name: 'Student User',
      email: 'student@example.com',
      password: 'password123',
      role: 'Student',
      studentId: 'STU001'
    });

    course = await Course.create({
      name: 'Introduction to Programming',
      description: 'Learn the basics of programming',
      subject: 'Computer Science',
      teacher: teacher._id
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    assignment = await Assignment.create({
      title: 'Programming Assignment 1',
      description: 'Create a simple calculator application',
      course: course._id,
      dueDate: futureDate,
      pointValue: 100
    });
  });

  describe('Validation', () => {
    test('should create a valid submission', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution to the calculator assignment.'
      };

      const submission = new Submission(submissionData);
      const savedSubmission = await submission.save();

      expect(savedSubmission._id).toBeDefined();
      expect(savedSubmission.assignment.toString()).toBe(assignment._id.toString());
      expect(savedSubmission.student.toString()).toBe(student._id.toString());
      expect(savedSubmission.submissionText).toBe(submissionData.submissionText);
      expect(savedSubmission.submittedAt).toBeDefined();
      expect(savedSubmission.isLate).toBe(false);
    });

    test('should require assignment reference', async () => {
      const submissionData = {
        student: student._id,
        submissionText: 'Here is my solution.'
      };

      const submission = new Submission(submissionData);
      await expect(submission.save()).rejects.toThrow('Assignment reference is required');
    });

    test('should require student reference', async () => {
      const submissionData = {
        assignment: assignment._id,
        submissionText: 'Here is my solution.'
      };

      const submission = new Submission(submissionData);
      await expect(submission.save()).rejects.toThrow('Student reference is required');
    });

    test('should validate submission text length', async () => {
      const longText = 'a'.repeat(5001); // Exceeds 5000 character limit

      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: longText
      };

      const submission = new Submission(submissionData);
      await expect(submission.save()).rejects.toThrow('Submission text cannot exceed 5000 characters');
    });

    test('should enforce unique submission per student per assignment', async () => {
      const submissionData1 = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'First submission'
      };

      const submissionData2 = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Second submission'
      };

      const submission1 = new Submission(submissionData1);
      await submission1.save();

      const submission2 = new Submission(submissionData2);
      await expect(submission2.save()).rejects.toThrow();
    });

    test('should validate grade range', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.',
        grade: -10 // Negative grade
      };

      const submission = new Submission(submissionData);
      await expect(submission.save()).rejects.toThrow('Grade cannot be negative');
    });

    test('should validate feedback length', async () => {
      const longFeedback = 'a'.repeat(2001); // Exceeds 2000 character limit

      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.',
        feedback: longFeedback
      };

      const submission = new Submission(submissionData);
      await expect(submission.save()).rejects.toThrow('Feedback cannot exceed 2000 characters');
    });
  });

  describe('Attachments', () => {
    test('should add attachments with file references', async () => {
      const file = await File.create({
        originalName: 'solution.js',
        filename: 'solution_123.js',
        mimetype: 'text/plain',
        size: 1024,
        path: '/uploads/solution_123.js',
        uploadedBy: student._id
      });

      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Please see attached file for my solution.',
        attachments: [{
          name: 'Calculator Solution',
          fileId: file._id
        }]
      };

      const submission = new Submission(submissionData);
      const savedSubmission = await submission.save();

      expect(savedSubmission.attachments).toHaveLength(1);
      expect(savedSubmission.attachments[0].name).toBe('Calculator Solution');
      expect(savedSubmission.attachments[0].fileId.toString()).toBe(file._id.toString());
    });
  });

  describe('Late Submission Detection', () => {
    test('should mark submission as late when submitted after due date', async () => {
      // Create assignment with past due date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const pastAssignment = new Assignment({
        title: 'Past Assignment',
        description: 'This assignment is overdue',
        course: course._id,
        dueDate: pastDate,
        pointValue: 100
      });
      await pastAssignment.save({ validateBeforeSave: false });

      const submissionData = {
        assignment: pastAssignment._id,
        student: student._id,
        submissionText: 'Late submission'
      };

      const submission = new Submission(submissionData);
      const savedSubmission = await submission.save();

      expect(savedSubmission.isLate).toBe(true);
    });

    test('should not mark submission as late when submitted before due date', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'On-time submission'
      };

      const submission = new Submission(submissionData);
      const savedSubmission = await submission.save();

      expect(savedSubmission.isLate).toBe(false);
    });
  });

  describe('Grading', () => {
    test('should set gradedAt when grade is assigned', async () => {
      const submission = await Submission.create({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.'
      });

      submission.grade = 85;
      submission.feedback = 'Good work!';
      submission.gradedBy = teacher._id;

      const savedSubmission = await submission.save();

      expect(savedSubmission.grade).toBe(85);
      expect(savedSubmission.feedback).toBe('Good work!');
      expect(savedSubmission.gradedAt).toBeDefined();
      expect(savedSubmission.gradedBy.toString()).toBe(teacher._id.toString());
    });

    test('should validate grade does not exceed assignment point value', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.',
        grade: 150 // Exceeds assignment's 100 point value
      };

      const submission = new Submission(submissionData);
      await expect(submission.save()).rejects.toThrow('Grade cannot exceed assignment point value');
    });
  });

  describe('Virtuals', () => {
    test('isGraded should return false for ungraded submission', async () => {
      const submission = await Submission.create({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.'
      });

      expect(submission.isGraded).toBe(false);
    });

    test('isGraded should return true for graded submission', async () => {
      const submission = await Submission.create({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.',
        grade: 85
      });

      expect(submission.isGraded).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    test('getGradePercentage should return null for ungraded submission', async () => {
      const submission = await Submission.create({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.'
      });

      const percentage = await submission.getGradePercentage();
      expect(percentage).toBeNull();
    });

    test('getGradePercentage should calculate correct percentage', async () => {
      const submission = await Submission.create({
        assignment: assignment._id,
        student: student._id,
        submissionText: 'Here is my solution.',
        grade: 85
      });

      const percentage = await submission.getGradePercentage();
      expect(percentage).toBe(85); // 85/100 * 100 = 85%
    });

    test('getGradePercentage should return null if assignment not found', async () => {
      const submission = new Submission({
        assignment: new mongoose.Types.ObjectId(),
        student: student._id,
        submissionText: 'Here is my solution.',
        grade: 85
      });

      const percentage = await submission.getGradePercentage();
      expect(percentage).toBeNull();
    });
  });
});