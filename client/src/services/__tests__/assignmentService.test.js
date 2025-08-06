import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as assignmentService from '../assignmentService.js';
import api from '../api.js';

// Mock the api module
vi.mock('../api.js');

describe('assignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAssignmentsByCourse', () => {
    it('should fetch assignments for a course', async () => {
      const mockAssignments = {
        success: true,
        data: [
          {
            _id: '1',
            title: 'Test Assignment',
            description: 'Test description',
            dueDate: '2024-12-31T23:59:59.000Z',
            pointValue: 100
          }
        ]
      };

      api.get.mockResolvedValue({ data: mockAssignments });

      const result = await assignmentService.getAssignmentsByCourse('course123');

      expect(api.get).toHaveBeenCalledWith('/assignments/course/course123');
      expect(result).toEqual(mockAssignments);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValue(error);

      await expect(assignmentService.getAssignmentsByCourse('course123'))
        .rejects.toThrow('Network error');
    });
  });

  describe('getAssignment', () => {
    it('should fetch a single assignment', async () => {
      const mockAssignment = {
        success: true,
        data: {
          _id: '1',
          title: 'Test Assignment',
          description: 'Test description',
          dueDate: '2024-12-31T23:59:59.000Z',
          pointValue: 100,
          course: { _id: 'course123', name: 'Test Course' }
        }
      };

      api.get.mockResolvedValue({ data: mockAssignment });

      const result = await assignmentService.getAssignment('assignment123');

      expect(api.get).toHaveBeenCalledWith('/assignments/assignment123');
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('submitAssignment', () => {
    it('should submit assignment with form data', async () => {
      const mockResponse = {
        success: true,
        data: {
          _id: 'submission123',
          assignment: 'assignment123',
          student: 'student123',
          submissionText: 'My submission',
          submittedAt: '2024-01-15T10:00:00.000Z'
        }
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const formData = new FormData();
      formData.append('submissionText', 'My submission');

      const result = await assignmentService.submitAssignment('assignment123', formData);

      expect(api.post).toHaveBeenCalledWith(
        '/assignments/assignment123/submit',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle submission errors', async () => {
      const error = new Error('Submission failed');
      api.post.mockRejectedValue(error);

      const formData = new FormData();
      await expect(assignmentService.submitAssignment('assignment123', formData))
        .rejects.toThrow('Submission failed');
    });
  });

  describe('getSubmissionDetails', () => {
    it('should fetch submission details', async () => {
      const mockSubmission = {
        success: true,
        data: {
          _id: 'submission123',
          assignment: 'assignment123',
          student: 'student123',
          submissionText: 'My submission',
          grade: 85,
          feedback: 'Good work!'
        }
      };

      api.get.mockResolvedValue({ data: mockSubmission });

      const result = await assignmentService.getSubmissionDetails('submission123');

      expect(api.get).toHaveBeenCalledWith('/assignments/submission/submission123');
      expect(result).toEqual(mockSubmission);
    });
  });

  describe('downloadFile', () => {
    it('should download file with blob response', async () => {
      const mockBlob = new Blob(['file content'], { type: 'application/pdf' });
      api.get.mockResolvedValue({ data: mockBlob });

      const result = await assignmentService.downloadFile('file123');

      expect(api.get).toHaveBeenCalledWith('/assignments/files/file123', {
        responseType: 'blob',
      });
      expect(result.data).toEqual(mockBlob);
    });
  });

  describe('getStudentGrades', () => {
    it('should fetch student grades', async () => {
      const mockGrades = {
        success: true,
        data: {
          grades: [
            {
              assignment: { title: 'Test Assignment', pointValue: 100 },
              grade: 85,
              submittedAt: '2024-01-15T10:00:00.000Z'
            }
          ],
          stats: {
            totalAssignments: 1,
            averageGrade: 85,
            averagePercentage: 85
          }
        }
      };

      api.get.mockResolvedValue({ data: mockGrades });

      const result = await assignmentService.getStudentGrades('student123');

      expect(api.get).toHaveBeenCalledWith('/assignments/student/student123/grades');
      expect(result).toEqual(mockGrades);
    });
  });
});