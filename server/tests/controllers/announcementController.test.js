import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import Announcement from '../../models/Announcement.js';
import announcementRoutes from '../../routes/announcementRoutes.js';
import { generateToken } from '../../utils/generateToken.js';
import '../setup.js';

const app = express();
app.use(express.json());
app.use('/api/announcements', announcementRoutes);

describe('Announcement Controller', () => {
  let adminUser, teacherUser, studentUser, course, adminToken, teacherToken, studentToken;

  beforeEach(async () => {
    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'Admin'
    });

    teacherUser = await User.create({
      name: 'Teacher User',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'TC123456'
    });

    studentUser = await User.create({
      name: 'Student User',
      email: 'student@test.com',
      password: 'password123',
      role: 'Student',
      studentId: 'ST123456'
    });

    // Create test course
    course = await Course.create({
      name: 'Test Course',
      description: 'A test course',
      subject: 'Computer Science',
      teacher: teacherUser._id,
      enrolledStudents: [studentUser._id]
    });

    // Update student's enrolled courses
    await User.findByIdAndUpdate(studentUser._id, {
      enrolledCourses: [course._id]
    });

    // Generate tokens
    adminToken = generateToken(adminUser._id, adminUser.role);
    teacherToken = generateToken(teacherUser._id, teacherUser.role);
    studentToken = generateToken(studentUser._id, studentUser.role);
  });

  describe('POST /api/announcements', () => {
    it('should create a global announcement as admin', async () => {
      const announcementData = {
        title: 'Global Announcement',
        content: 'This is a global announcement for all users',
        isGlobal: true,
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(announcementData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(announcementData.title);
      expect(response.body.data.isGlobal).toBe(true);
      expect(response.body.data.author.name).toBe(adminUser.name);
    });

    it('should create a course announcement as teacher', async () => {
      const announcementData = {
        title: 'Course Announcement',
        content: 'This is a course-specific announcement',
        courseId: course._id.toString(),
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(announcementData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(announcementData.title);
      expect(response.body.data.isGlobal).toBe(false);
      expect(response.body.data.course.name).toBe(course.name);
    });

    it('should not allow teacher to create global announcement', async () => {
      const announcementData = {
        title: 'Unauthorized Global Announcement',
        content: 'This should not be allowed',
        isGlobal: true
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(announcementData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should not allow teacher to create announcement for course they do not teach', async () => {
      // Create another teacher and course
      const anotherTeacher = await User.create({
        name: 'Another Teacher',
        email: 'another@test.com',
        password: 'password123',
        role: 'Teacher',
        teacherCredentials: 'TC789012'
      });

      const anotherCourse = await Course.create({
        name: 'Another Course',
        description: 'Another test course',
        subject: 'Mathematics',
        teacher: anotherTeacher._id
      });

      const announcementData = {
        title: 'Unauthorized Course Announcement',
        content: 'This should not be allowed',
        courseId: anotherCourse._id.toString()
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(announcementData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should not allow student to create announcement', async () => {
      const announcementData = {
        title: 'Student Announcement',
        content: 'Students should not be able to create announcements'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(announcementData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/announcements', () => {
    beforeEach(async () => {
      // Create test announcements
      await Announcement.create({
        title: 'Global Announcement 1',
        content: 'Global content 1',
        author: adminUser._id,
        isGlobal: true,
        priority: 'high'
      });

      await Announcement.create({
        title: 'Course Announcement 1',
        content: 'Course content 1',
        author: teacherUser._id,
        course: course._id,
        priority: 'normal'
      });
    });

    it('should get all announcements for student (global + enrolled courses)', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // 1 global + 1 course
    });

    it('should get all announcements for teacher (global + their courses)', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // 1 global + 1 course they teach
    });

    it('should get all announcements for admin', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // All announcements
    });
  });

  describe('GET /api/announcements/global', () => {
    beforeEach(async () => {
      await Announcement.create({
        title: 'Global Announcement 1',
        content: 'Global content 1',
        author: adminUser._id,
        isGlobal: true,
        priority: 'high'
      });

      await Announcement.create({
        title: 'Course Announcement 1',
        content: 'Course content 1',
        author: teacherUser._id,
        course: course._id
      });
    });

    it('should get only global announcements', async () => {
      const response = await request(app)
        .get('/api/announcements/global')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isGlobal).toBe(true);
    });
  });

  describe('GET /api/announcements/course/:courseId', () => {
    let courseAnnouncement;

    beforeEach(async () => {
      courseAnnouncement = await Announcement.create({
        title: 'Course Announcement',
        content: 'Course content',
        author: teacherUser._id,
        course: course._id
      });
    });

    it('should get course announcements for enrolled student', async () => {
      const response = await request(app)
        .get(`/api/announcements/course/${course._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(courseAnnouncement._id.toString());
    });

    it('should get course announcements for course teacher', async () => {
      const response = await request(app)
        .get(`/api/announcements/course/${course._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should not allow access to course announcements for non-enrolled student', async () => {
      const anotherStudent = await User.create({
        name: 'Another Student',
        email: 'another.student@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'ST789012'
      });

      const anotherStudentToken = generateToken(anotherStudent._id, anotherStudent.role);

      const response = await request(app)
        .get(`/api/announcements/course/${course._id}`)
        .set('Authorization', `Bearer ${anotherStudentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent course', async () => {
      const nonExistentCourseId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/announcements/course/${nonExistentCourseId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COURSE_NOT_FOUND');
    });
  });

  describe('GET /api/announcements/:id', () => {
    let globalAnnouncement, courseAnnouncement;

    beforeEach(async () => {
      globalAnnouncement = await Announcement.create({
        title: 'Global Announcement',
        content: 'Global content',
        author: adminUser._id,
        isGlobal: true
      });

      courseAnnouncement = await Announcement.create({
        title: 'Course Announcement',
        content: 'Course content',
        author: teacherUser._id,
        course: course._id
      });
    });

    it('should get global announcement by ID', async () => {
      const response = await request(app)
        .get(`/api/announcements/${globalAnnouncement._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(globalAnnouncement._id.toString());
    });

    it('should get course announcement by ID for enrolled student', async () => {
      const response = await request(app)
        .get(`/api/announcements/${courseAnnouncement._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(courseAnnouncement._id.toString());
    });

    it('should return 404 for non-existent announcement', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/announcements/${nonExistentId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANNOUNCEMENT_NOT_FOUND');
    });
  });

  describe('PUT /api/announcements/:id', () => {
    let announcement;

    beforeEach(async () => {
      announcement = await Announcement.create({
        title: 'Original Title',
        content: 'Original content',
        author: teacherUser._id,
        course: course._id,
        priority: 'normal'
      });
    });

    it('should update announcement by author', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.priority).toBe(updateData.priority);
    });

    it('should update announcement by admin', async () => {
      const updateData = {
        title: 'Admin Updated Title'
      };

      const response = await request(app)
        .put(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should not allow non-author to update announcement', async () => {
      const anotherTeacher = await User.create({
        name: 'Another Teacher',
        email: 'another.teacher@test.com',
        password: 'password123',
        role: 'Teacher',
        teacherCredentials: 'TC345678'
      });

      const anotherTeacherToken = generateToken(anotherTeacher._id, anotherTeacher.role);

      const response = await request(app)
        .put(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${anotherTeacherToken}`)
        .send({ title: 'Unauthorized Update' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should not allow student to update announcement', async () => {
      const response = await request(app)
        .put(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Update' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/announcements/:id', () => {
    let announcement;

    beforeEach(async () => {
      announcement = await Announcement.create({
        title: 'To Be Deleted',
        content: 'This will be deleted',
        author: teacherUser._id,
        course: course._id
      });
    });

    it('should delete announcement by author (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deletedAnnouncement = await Announcement.findById(announcement._id);
      expect(deletedAnnouncement.isActive).toBe(false);
    });

    it('should delete announcement by admin', async () => {
      const response = await request(app)
        .delete(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow non-author to delete announcement', async () => {
      const anotherTeacher = await User.create({
        name: 'Another Teacher',
        email: 'another.teacher@test.com',
        password: 'password123',
        role: 'Teacher',
        teacherCredentials: 'TC567890'
      });

      const anotherTeacherToken = generateToken(anotherTeacher._id, anotherTeacher.role);

      const response = await request(app)
        .delete(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${anotherTeacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/announcements/authored', () => {
    beforeEach(async () => {
      await Announcement.create({
        title: 'Teacher Announcement 1',
        content: 'Content for announcement 1',
        author: teacherUser._id,
        course: course._id
      });

      await Announcement.create({
        title: 'Teacher Announcement 2',
        content: 'Content for announcement 2',
        author: teacherUser._id,
        course: course._id
      });

      await Announcement.create({
        title: 'Admin Announcement',
        content: 'Admin announcement content',
        author: adminUser._id,
        isGlobal: true
      });
    });

    it('should get authored announcements for teacher', async () => {
      const response = await request(app)
        .get('/api/announcements/authored')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(ann => ann.author._id === teacherUser._id.toString())).toBe(true);
    });

    it('should get authored announcements for admin', async () => {
      const response = await request(app)
        .get('/api/announcements/authored')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].author._id).toBe(adminUser._id.toString());
    });

    it('should not allow student to access authored announcements', async () => {
      const response = await request(app)
        .get('/api/announcements/authored')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all routes', async () => {
      const response = await request(app)
        .get('/api/announcements');

      expect(response.status).toBe(401);
    });

    it('should validate JWT token', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});