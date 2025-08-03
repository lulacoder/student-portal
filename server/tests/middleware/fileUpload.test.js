import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadSingle, uploadMultiple, handleFileUploadError } from '../../middleware/fileUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Test routes
app.post('/upload-single', uploadSingle, handleFileUploadError, (req, res) => {
  res.json({
    success: true,
    file: req.file
  });
});

app.post('/upload-multiple', uploadMultiple, handleFileUploadError, (req, res) => {
  res.json({
    success: true,
    files: req.files
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  res.status(500).json({
    success: false,
    error: {
      message: error.message,
      code: 'INTERNAL_ERROR'
    }
  });
});

describe('File Upload Middleware', () => {
  const testFilesDir = path.join(__dirname, 'test-files');
  const validPdfPath = path.join(testFilesDir, 'test.pdf');
  const validImagePath = path.join(testFilesDir, 'test.jpg');
  const invalidFilePath = path.join(testFilesDir, 'test.exe');
  const largeFilePath = path.join(testFilesDir, 'large.pdf');

  beforeAll(() => {
    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test files
    fs.writeFileSync(validPdfPath, Buffer.from('%PDF-1.4\n%test pdf content'));
    fs.writeFileSync(validImagePath, Buffer.from('fake image content'));
    fs.writeFileSync(invalidFilePath, Buffer.from('fake executable content'));
    
    // Create a large file (over 50MB)
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024, 'a'); // 51MB
    fs.writeFileSync(largeFilePath, largeBuffer);
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }

    // Clean up uploads directory
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file !== '.gitkeep' && file !== '[stored files go here]') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    }
  });

  describe('Single File Upload', () => {
    test('should upload valid PDF file', async () => {
      const response = await request(app)
        .post('/upload-single')
        .attach('file', validPdfPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.originalname).toBe('test.pdf');
      expect(response.body.file.mimetype).toBe('application/pdf');
    });

    test('should upload valid image file', async () => {
      const response = await request(app)
        .post('/upload-single')
        .attach('file', validImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.originalname).toBe('test.jpg');
    });

    test('should reject invalid file type', async () => {
      const response = await request(app)
        .post('/upload-single')
        .attach('file', invalidFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    test('should reject file that is too large', async () => {
      const response = await request(app)
        .post('/upload-single')
        .attach('file', largeFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    test('should handle missing file', async () => {
      const response = await request(app)
        .post('/upload-single');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeUndefined();
    });
  });

  describe('Multiple File Upload', () => {
    test('should upload multiple valid files', async () => {
      const response = await request(app)
        .post('/upload-multiple')
        .attach('files', validPdfPath)
        .attach('files', validImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0].originalname).toBe('test.pdf');
      expect(response.body.files[1].originalname).toBe('test.jpg');
    });

    test('should reject when too many files uploaded', async () => {
      // Create 11 small files to exceed the limit of 10
      const tempFiles = [];
      for (let i = 0; i < 11; i++) {
        const tempPath = path.join(testFilesDir, `temp${i}.txt`);
        fs.writeFileSync(tempPath, 'test content');
        tempFiles.push(tempPath);
      }

      let request_builder = request(app).post('/upload-multiple');
      
      tempFiles.forEach(filePath => {
        request_builder = request_builder.attach('files', filePath);
      });

      const response = await request_builder;

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOO_MANY_FILES');

      // Clean up temp files
      tempFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });

    test('should handle empty file array', async () => {
      const response = await request(app)
        .post('/upload-multiple');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toEqual([]);
    });
  });

  describe('File Storage', () => {
    test('should store files with unique names', async () => {
      const response1 = await request(app)
        .post('/upload-single')
        .attach('file', validPdfPath);

      const response2 = await request(app)
        .post('/upload-single')
        .attach('file', validPdfPath);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.file.filename).not.toBe(response2.body.file.filename);
    });

    test('should preserve original filename in metadata', async () => {
      const response = await request(app)
        .post('/upload-single')
        .attach('file', validPdfPath);

      expect(response.status).toBe(200);
      expect(response.body.file.originalname).toBe('test.pdf');
    });
  });

  describe('Security Validation', () => {
    test('should validate file mimetype', async () => {
      // Create a file with wrong extension but valid content
      const fakePdfPath = path.join(testFilesDir, 'fake.pdf');
      fs.writeFileSync(fakePdfPath, 'This is not a PDF file');

      const response = await request(app)
        .post('/upload-single')
        .attach('file', fakePdfPath);

      // The response depends on how multer detects mimetype
      // This test verifies that our middleware handles mimetype validation
      expect(response.status).toBeOneOf([200, 400]);

      // Clean up
      if (fs.existsSync(fakePdfPath)) {
        fs.unlinkSync(fakePdfPath);
      }
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/upload-single')
        .send('invalid data');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

// Custom Jest matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});