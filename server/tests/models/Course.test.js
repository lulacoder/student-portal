const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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
  await Course.deleteMany({});
  await User.deleteMany({});
  await File.deleteMany({});
});

describe('Course Model', () => {
  let teacher, student, admin;

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

    admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'Admin'
    });
  });

  describe('Validation', () => {
    test('should create a valid course', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming with JavaScript',
        subject: 'Computer Science',
        teacher: teacher._id
      };

      const course = new Course(courseData);
      const savedCourse = await course.save();

      expect(savedCourse._id).toBeDefined();
      expect(savedCourse.name).toBe(courseData.name);
      expect(savedCourse.description).toBe(courseData.description);
      expect(savedCourse.subject).toBe(courseData.subject);
      expect(savedCourse.teacher.toString()).toBe(teacher._id.toString());
      expect(savedCourse.isActive).toBe(true);
    });

    test('should require course name', async () => {
      const courseData = {
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: teacher._id
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow('Course name is required');
    });

    test('should validate course name length', async () => {
      const courseData = {
        name: 'AB', // Too short
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: teacher._id
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow('Course name must be at least 3 characters long');
    });

    test('should require course description', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        subject: 'Computer Science',
        teacher: teacher._id
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow('Course description is required');
    });

    test('should validate description length', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        description: 'Short', // Too short
        subject: 'Computer Science',
        teacher: teacher._id
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow('Course description must be at least 10 characters long');
    });

    test('should require subject', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        teacher: teacher._id
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow('Course subject is required');
    });

    test('should require teacher', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science'
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow('Course teacher is required');
    });

    test('should allow admin as teacher', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: admin._id
      };

      const course = new Course(courseData);
      const savedCourse = await course.save();

      expect(savedCourse.teacher.toString()).toBe(admin._id.toString());
    });
  });

  describe('Materials', () => {
    test('should add materials with file references', async () => {
      const file = await File.create({
        originalName: 'lecture1.pdf',
        filename: 'lecture1_123.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/lecture1_123.pdf',
        uploadedBy: teacher._id
      });

      const courseData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: teacher._id,
        materials: [{
          name: 'Lecture 1 - Introduction',
          fileId: file._id
        }]
      };

      const course = new Course(courseData);
      const savedCourse = await course.save();

      expect(savedCourse.materials).toHaveLength(1);
      expect(savedCourse.materials[0].name).toBe('Lecture 1 - Introduction');
      expect(savedCourse.materials[0].fileId.toString()).toBe(file._id.toString());
      expect(savedCourse.materials[0].uploadDate).toBeDefined();
    });
  });

  describe('Student Enrollment', () => {
    test('should enroll students', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: teacher._id,
        enrolledStudents: [student._id]
      };

      const course = new Course(courseData);
      const savedCourse = await course.save();

      expect(savedCourse.enrolledStudents).toHaveLength(1);
      expect(savedCourse.enrolledStudents[0].toString()).toBe(student._id.toString());
    });
  });

  describe('Instance Methods', () => {
    let course;

    beforeEach(async () => {
      course = await Course.create({
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: teacher._id
      });
    });

    test('isStudentEnrolled should return false for unenrolled student', () => {
      const isEnrolled = course.isStudentEnrolled(student._id);
      expect(isEnrolled).toBe(false);
    });

    test('isStudentEnrolled should return true for enrolled student', async () => {
      course.enrolledStudents.push(student._id);
      await course.save();

      const isEnrolled = course.isStudentEnrolled(student._id);
      expect(isEnrolled).toBe(true);
    });

    test('enrollStudent should add student to enrollment', () => {
      course.enrollStudent(student._id);
      expect(course.enrolledStudents).toHaveLength(1);
      expect(course.enrolledStudents[0].toString()).toBe(student._id.toString());
    });

    test('enrollStudent should not add duplicate students', () => {
      course.enrollStudent(student._id);
      course.enrollStudent(student._id);
      expect(course.enrolledStudents).toHaveLength(1);
    });

    test('unenrollStudent should remove student from enrollment', () => {
      course.enrollStudent(student._id);
      expect(course.enrolledStudents).toHaveLength(1);

      course.unenrollStudent(student._id);
      expect(course.enrolledStudents).toHaveLength(0);
    });
  });

  describe('Virtuals', () => {
    test('enrollmentCount should return correct count', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science',
        teacher: teacher._id,
        enrolledStudents: [student._id]
      });

      expect(course.enrollmentCount).toBe(1);
    });
  });
});