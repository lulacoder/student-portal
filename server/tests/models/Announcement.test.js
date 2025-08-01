const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Announcement = require('../../models/Announcement');
const Course = require('../../models/Course');
const User = require('../../models/User');

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
  await Announcement.deleteMany({});
  await Course.deleteMany({});
  await User.deleteMany({});
});

describe('Announcement Model', () => {
  let teacher, admin, student, course;

  beforeEach(async () => {
    teacher = await User.create({
      name: 'Teacher User',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });

    admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'Admin'
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
      teacher: teacher._id,
      enrolledStudents: [student._id]
    });

    // Update student's enrolled courses
    student.enrolledCourses.push(course._id);
    await student.save();
  });

  describe('Validation', () => {
    test('should create a valid course announcement', async () => {
      const announcementData = {
        title: 'Assignment Due Date Extended',
        content: 'The due date for Assignment 1 has been extended to next Friday.',
        author: teacher._id,
        course: course._id
      };

      const announcement = new Announcement(announcementData);
      const savedAnnouncement = await announcement.save();

      expect(savedAnnouncement._id).toBeDefined();
      expect(savedAnnouncement.title).toBe(announcementData.title);
      expect(savedAnnouncement.content).toBe(announcementData.content);
      expect(savedAnnouncement.author.toString()).toBe(teacher._id.toString());
      expect(savedAnnouncement.course.toString()).toBe(course._id.toString());
      expect(savedAnnouncement.isGlobal).toBe(false);
      expect(savedAnnouncement.isActive).toBe(true);
      expect(savedAnnouncement.priority).toBe('normal');
    });

    test('should create a valid global announcement', async () => {
      const announcementData = {
        title: 'System Maintenance',
        content: 'The system will be down for maintenance this weekend.',
        author: admin._id,
        isGlobal: true
      };

      const announcement = new Announcement(announcementData);
      const savedAnnouncement = await announcement.save();

      expect(savedAnnouncement.isGlobal).toBe(true);
      expect(savedAnnouncement.course).toBeUndefined();
    });

    test('should require title', async () => {
      const announcementData = {
        content: 'This is an announcement without a title.',
        author: teacher._id,
        course: course._id
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Announcement title is required');
    });

    test('should validate title length', async () => {
      const announcementData = {
        title: 'AB', // Too short
        content: 'This is an announcement with a short title.',
        author: teacher._id,
        course: course._id
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Title must be at least 3 characters long');
    });

    test('should require content', async () => {
      const announcementData = {
        title: 'Announcement Title',
        author: teacher._id,
        course: course._id
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Announcement content is required');
    });

    test('should validate content length', async () => {
      const announcementData = {
        title: 'Announcement Title',
        content: 'Short', // Too short
        author: teacher._id,
        course: course._id
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Content must be at least 10 characters long');
    });

    test('should require author', async () => {
      const announcementData = {
        title: 'Announcement Title',
        content: 'This is an announcement without an author.',
        course: course._id
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Author is required');
    });

    test('should validate priority values', async () => {
      const announcementData = {
        title: 'Announcement Title',
        content: 'This is an announcement with invalid priority.',
        author: teacher._id,
        course: course._id,
        priority: 'invalid'
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Priority must be low, normal, high, or urgent');
    });

    test('should prevent global announcement with course', async () => {
      const announcementData = {
        title: 'Invalid Global Announcement',
        content: 'This global announcement incorrectly has a course.',
        author: admin._id,
        course: course._id,
        isGlobal: true
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Global announcements cannot have a course');
    });

    test('should require course for non-global announcement', async () => {
      const announcementData = {
        title: 'Course Announcement',
        content: 'This course announcement is missing a course reference.',
        author: teacher._id,
        isGlobal: false
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Path `course` is required');
    });

    test('should prevent non-admin from creating global announcement', async () => {
      const announcementData = {
        title: 'Unauthorized Global Announcement',
        content: 'A teacher trying to create a global announcement.',
        author: teacher._id,
        isGlobal: true
      };

      const announcement = new Announcement(announcementData);
      await expect(announcement.save()).rejects.toThrow('Only Admins can create global announcements');
    });
  });

  describe('Priority Levels', () => {
    test('should accept all valid priority levels', async () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];

      for (const priority of priorities) {
        const announcementData = {
          title: `${priority} Priority Announcement`,
          content: `This is a ${priority} priority announcement.`,
          author: teacher._id,
          course: course._id,
          priority: priority
        };

        const announcement = new Announcement(announcementData);
        const savedAnnouncement = await announcement.save();

        expect(savedAnnouncement.priority).toBe(priority);
      }
    });
  });

  describe('Virtuals', () => {
    test('isRecent should return true for announcement within 7 days', async () => {
      const announcement = await Announcement.create({
        title: 'Recent Announcement',
        content: 'This announcement was created recently.',
        author: teacher._id,
        course: course._id
      });

      expect(announcement.isRecent).toBe(true);
    });

    test('isRecent should return false for old announcement', async () => {
      const announcement = new Announcement({
        title: 'Old Announcement',
        content: 'This announcement is old.',
        author: teacher._id,
        course: course._id
      });

      // Set creation date to 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      announcement.createdAt = tenDaysAgo;

      const savedAnnouncement = await announcement.save();
      expect(savedAnnouncement.isRecent).toBe(false);
    });
  });

  describe('Static Methods', () => {
    test('getAnnouncementsForUser should return global and course announcements for student', async () => {
      // Create global announcement
      await Announcement.create({
        title: 'Global Announcement',
        content: 'This is a global announcement.',
        author: admin._id,
        isGlobal: true
      });

      // Create course announcement
      await Announcement.create({
        title: 'Course Announcement',
        content: 'This is a course announcement.',
        author: teacher._id,
        course: course._id
      });

      // Create announcement for different course (should not be included)
      const otherCourse = await Course.create({
        name: 'Other Course',
        description: 'Another course',
        subject: 'Mathematics',
        teacher: teacher._id
      });

      await Announcement.create({
        title: 'Other Course Announcement',
        content: 'This is for a different course.',
        author: teacher._id,
        course: otherCourse._id
      });

      const announcements = await Announcement.getAnnouncementsForUser(student._id);

      expect(announcements).toHaveLength(2);
      expect(announcements.some(a => a.title === 'Global Announcement')).toBe(true);
      expect(announcements.some(a => a.title === 'Course Announcement')).toBe(true);
      expect(announcements.some(a => a.title === 'Other Course Announcement')).toBe(false);
    });

    test('getAnnouncementsForUser should return announcements for teacher courses', async () => {
      // Create course announcement for teacher's course
      await Announcement.create({
        title: 'Teacher Course Announcement',
        content: 'This is for the teacher\'s course.',
        author: admin._id,
        course: course._id
      });

      const announcements = await Announcement.getAnnouncementsForUser(teacher._id);

      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements.some(a => a.title === 'Teacher Course Announcement')).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    test('canUserEdit should return true for admin', async () => {
      const announcement = await Announcement.create({
        title: 'Test Announcement',
        content: 'This is a test announcement.',
        author: teacher._id,
        course: course._id
      });

      const canEdit = announcement.canUserEdit(admin._id, 'Admin');
      expect(canEdit).toBe(true);
    });

    test('canUserEdit should return true for author', async () => {
      const announcement = await Announcement.create({
        title: 'Test Announcement',
        content: 'This is a test announcement.',
        author: teacher._id,
        course: course._id
      });

      const canEdit = announcement.canUserEdit(teacher._id, 'Teacher');
      expect(canEdit).toBe(true);
    });

    test('canUserEdit should return false for non-author non-admin', async () => {
      const announcement = await Announcement.create({
        title: 'Test Announcement',
        content: 'This is a test announcement.',
        author: teacher._id,
        course: course._id
      });

      const canEdit = announcement.canUserEdit(student._id, 'Student');
      expect(canEdit).toBe(false);
    });
  });
});