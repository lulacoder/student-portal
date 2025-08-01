const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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
  await User.deleteMany({});
});

describe('User Model', () => {
  describe('Validation', () => {
    test('should create a valid student user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.studentId).toBe(userData.studentId);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    test('should create a valid teacher user', async () => {
      const userData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'Teacher',
        teacherCredentials: 'PhD in Computer Science'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.role).toBe('Teacher');
      expect(savedUser.teacherCredentials).toBe(userData.teacherCredentials);
    });

    test('should create a valid admin user', async () => {
      const userData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'Admin'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.role).toBe('Admin');
    });

    test('should require name', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Name is required');
    });

    test('should require email', async () => {
      const userData = {
        name: 'John Doe',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Email is required');
    });

    test('should validate email format', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Please enter a valid email address');
    });

    test('should require unique email', async () => {
      const userData1 = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const userData2 = {
        name: 'Jane Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Teacher',
        teacherCredentials: 'PhD'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    test('should require password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Password is required');
    });

    test('should validate password length', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Password must be at least 6 characters long');
    });

    test('should require role', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Role is required');
    });

    test('should validate role values', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'InvalidRole'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Role must be either Student, Teacher, or Admin');
    });

    test('should require studentId for students', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Path `studentId` is required');
    });

    test('should require teacherCredentials for teachers', async () => {
      const userData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'Teacher'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Path `teacherCredentials` is required');
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before saving', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    test('should not rehash password if not modified', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      const originalHash = savedUser.password;

      savedUser.name = 'John Updated';
      const updatedUser = await savedUser.save();

      expect(updatedUser.password).toBe(originalHash);
    });
  });

  describe('Instance Methods', () => {
    test('comparePassword should return true for correct password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    test('comparePassword should return false for incorrect password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    test('toSafeObject should exclude password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU001'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      const safeObject = savedUser.toSafeObject();

      expect(safeObject.password).toBeUndefined();
      expect(safeObject.name).toBe(userData.name);
      expect(safeObject.email).toBe(userData.email);
    });
  });
});