const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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
  await Assignment.deleteMany({});
  await Course.deleteMany({});
  await User.deleteMany({});
  await File.deleteMany({});
});

describe('Assignment Model', () => {
  let teacher, course;

  beforeEach(async () => {
    teacher = await User.create({
      name: 'Teacher User',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });

    course = await Course.create({
      name: 'Introduction to Programming',
      description: 'Learn the basics of programming',
      subject: 'Computer Science',
      teacher: teacher._id
    });
  });

  describe('Validation', () => {
    test('should create a valid assignment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application using JavaScript',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment._id).toBeDefined();
      expect(savedAssignment.title).toBe(assignmentData.title);
      expect(savedAssignment.description).toBe(assignmentData.description);
      expect(savedAssignment.course.toString()).toBe(course._id.toString());
      expect(savedAssignment.dueDate).toEqual(futureDate);
      expect(savedAssignment.pointValue).toBe(100);
      expect(savedAssignment.isActive).toBe(true);
    });

    test('should require title', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Assignment title is required');
    });

    test('should validate title length', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'AB', // Too short
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Assignment title must be at least 3 characters long');
    });

    test('should require description', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Assignment description is required');
    });

    test('should validate description length', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Short', // Too short
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Assignment description must be at least 10 characters long');
    });

    test('should require course reference', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        dueDate: futureDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Course reference is required');
    });

    test('should require due date', async () => {
      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Due date is required');
    });

    test('should validate future due date for new assignments', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: pastDate,
        pointValue: 100
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Due date must be in the future');
    });

    test('should require point value', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Point value is required');
    });

    test('should validate point value range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: -10 // Negative value
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Point value cannot be negative');
    });

    test('should validate maximum point value', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 1500 // Too high
      };

      const assignment = new Assignment(assignmentData);
      await expect(assignment.save()).rejects.toThrow('Point value cannot exceed 1000');
    });
  });

  describe('Attachments', () => {
    test('should add attachments with file references', async () => {
      const file = await File.create({
        originalName: 'assignment_template.pdf',
        filename: 'assignment_template_123.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/assignment_template_123.pdf',
        uploadedBy: teacher._id
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100,
        attachments: [{
          name: 'Assignment Template',
          fileId: file._id
        }]
      };

      const assignment = new Assignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.attachments).toHaveLength(1);
      expect(savedAssignment.attachments[0].name).toBe('Assignment Template');
      expect(savedAssignment.attachments[0].fileId.toString()).toBe(file._id.toString());
    });
  });

  describe('Virtuals', () => {
    test('isOverdue should return false for future due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignment = await Assignment.create({
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      });

      expect(assignment.isOverdue).toBe(false);
    });

    test('isOverdue should return true for past due date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Create assignment with past due date (bypassing validation)
      const assignment = new Assignment({
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: pastDate,
        pointValue: 100
      });
      
      // Save without validation to test overdue logic
      await assignment.save({ validateBeforeSave: false });

      expect(assignment.isOverdue).toBe(true);
    });

    test('daysUntilDue should calculate correct days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const assignment = await Assignment.create({
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100
      });

      expect(assignment.daysUntilDue).toBe(3);
    });
  });

  describe('Instance Methods', () => {
    test('acceptsSubmissions should return true for active assignment before due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignment = await Assignment.create({
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100,
        isActive: true
      });

      expect(assignment.acceptsSubmissions()).toBe(true);
    });

    test('acceptsSubmissions should return false for inactive assignment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const assignment = await Assignment.create({
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: futureDate,
        pointValue: 100,
        isActive: false
      });

      expect(assignment.acceptsSubmissions()).toBe(false);
    });

    test('acceptsSubmissions should return false for overdue assignment', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const assignment = new Assignment({
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator application',
        course: course._id,
        dueDate: pastDate,
        pointValue: 100,
        isActive: true
      });
      
      await assignment.save({ validateBeforeSave: false });

      expect(assignment.acceptsSubmissions()).toBe(false);
    });
  });
});