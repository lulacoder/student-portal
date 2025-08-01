const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const File = require('../../models/File');
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
  await File.deleteMany({});
  await User.deleteMany({});
});

describe('File Model', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'Teacher',
      teacherCredentials: 'PhD in Computer Science'
    });
  });

  describe('Validation', () => {
    test('should create a valid file', async () => {
      const fileData = {
        originalName: 'document.pdf',
        filename: 'document_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000, // 1MB
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile._id).toBeDefined();
      expect(savedFile.originalName).toBe(fileData.originalName);
      expect(savedFile.filename).toBe(fileData.filename);
      expect(savedFile.mimetype).toBe(fileData.mimetype);
      expect(savedFile.size).toBe(fileData.size);
      expect(savedFile.path).toBe(fileData.path);
      expect(savedFile.uploadedBy.toString()).toBe(user._id.toString());
      expect(savedFile.uploadedAt).toBeDefined();
    });

    test('should require original name', async () => {
      const fileData = {
        filename: 'document_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('Original filename is required');
    });

    test('should require filename', async () => {
      const fileData = {
        originalName: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('Filename is required');
    });

    test('should require unique filename', async () => {
      const fileData1 = {
        originalName: 'document1.pdf',
        filename: 'document_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const fileData2 = {
        originalName: 'document2.pdf',
        filename: 'document_123456.pdf', // Same filename
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const file1 = new File(fileData1);
      await file1.save();

      const file2 = new File(fileData2);
      await expect(file2.save()).rejects.toThrow();
    });

    test('should require mimetype', async () => {
      const fileData = {
        originalName: 'document.pdf',
        filename: 'document_123456.pdf',
        size: 1024000,
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('File mimetype is required');
    });

    test('should validate allowed mimetypes', async () => {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed'
      ];

      for (const mimetype of allowedTypes) {
        const fileData = {
          originalName: 'test-file',
          filename: `test-file-${Date.now()}.ext`,
          mimetype: mimetype,
          size: 1024000,
          path: '/uploads/test-file.ext',
          uploadedBy: user._id
        };

        const file = new File(fileData);
        const savedFile = await file.save();
        expect(savedFile.mimetype).toBe(mimetype);
      }
    });

    test('should reject disallowed mimetypes', async () => {
      const fileData = {
        originalName: 'malicious.exe',
        filename: 'malicious_123456.exe',
        mimetype: 'application/x-executable',
        size: 1024000,
        path: '/uploads/malicious_123456.exe',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('File type not allowed');
    });

    test('should require file size', async () => {
      const fileData = {
        originalName: 'document.pdf',
        filename: 'document_123456.pdf',
        mimetype: 'application/pdf',
        path: '/uploads/document_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('File size is required');
    });

    test('should validate maximum file size', async () => {
      const fileData = {
        originalName: 'large-file.pdf',
        filename: 'large-file_123456.pdf',
        mimetype: 'application/pdf',
        size: 60 * 1024 * 1024, // 60MB - exceeds 50MB limit
        path: '/uploads/large-file_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('File size cannot exceed 50MB');
    });

    test('should require file path', async () => {
      const fileData = {
        originalName: 'document.pdf',
        filename: 'document_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        uploadedBy: user._id
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('File path is required');
    });

    test('should require uploader', async () => {
      const fileData = {
        originalName: 'document.pdf',
        filename: 'document_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/document_123456.pdf'
      };

      const file = new File(fileData);
      await expect(file.save()).rejects.toThrow('Uploader is required');
    });
  });

  describe('File Size Validation', () => {
    test('should accept file at maximum size limit', async () => {
      const fileData = {
        originalName: 'max-size-file.pdf',
        filename: 'max-size-file_123456.pdf',
        mimetype: 'application/pdf',
        size: 50 * 1024 * 1024, // Exactly 50MB
        path: '/uploads/max-size-file_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile.size).toBe(50 * 1024 * 1024);
    });

    test('should accept small files', async () => {
      const fileData = {
        originalName: 'small-file.txt',
        filename: 'small-file_123456.txt',
        mimetype: 'text/plain',
        size: 1024, // 1KB
        path: '/uploads/small-file_123456.txt',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile.size).toBe(1024);
    });
  });

  describe('Indexes', () => {
    test('should create files with different uploaders and dates', async () => {
      const user2 = await User.create({
        name: 'Second User',
        email: 'user2@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU002'
      });

      const fileData1 = {
        originalName: 'file1.pdf',
        filename: 'file1_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/file1_123456.pdf',
        uploadedBy: user._id
      };

      const fileData2 = {
        originalName: 'file2.pdf',
        filename: 'file2_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/file2_123456.pdf',
        uploadedBy: user2._id
      };

      const file1 = await File.create(fileData1);
      const file2 = await File.create(fileData2);

      expect(file1.uploadedBy.toString()).toBe(user._id.toString());
      expect(file2.uploadedBy.toString()).toBe(user2._id.toString());
    });
  });

  describe('Timestamps', () => {
    test('should automatically set uploadedAt timestamp', async () => {
      const fileData = {
        originalName: 'timestamped-file.pdf',
        filename: 'timestamped-file_123456.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        path: '/uploads/timestamped-file_123456.pdf',
        uploadedBy: user._id
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile.uploadedAt).toBeDefined();
      expect(savedFile.uploadedAt).toBeInstanceOf(Date);
      expect(savedFile.createdAt).toBeDefined();
      expect(savedFile.updatedAt).toBeDefined();
    });
  });
});