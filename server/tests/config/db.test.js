const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB } = require('../../config/db');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.ATLAS_URI = mongoUri;
});

afterAll(async () => {
  await mongoServer.stop();
});

describe('Database Connection', () => {
  test('should connect to MongoDB successfully', async () => {
    const connection = await connectDB();
    
    expect(connection).toBeDefined();
    expect(mongoose.connection.readyState).toBe(1); // Connected
    
    await disconnectDB();
    expect(mongoose.connection.readyState).toBe(0); // Disconnected
  });

  test('should handle connection errors gracefully', async () => {
    // Mock console.error to capture error logs
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Set invalid connection string
    process.env.ATLAS_URI = 'invalid-connection-string';

    await connectDB();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Database connection error:',
      expect.any(String)
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Restore mocks
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});