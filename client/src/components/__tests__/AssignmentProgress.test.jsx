import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AssignmentProgress from '../AssignmentProgress.jsx';
import * as assignmentService from '../../services/assignmentService.js';

// Mock the assignment service
vi.mock('../../services/assignmentService.js', () => ({
  getStudentGrades: vi.fn()
}));

const mockUser = {
  id: 'student1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Student'
};

const mockProgressData = {
  totalAssignments: 5,
  averagePercentage: 85.5,
  totalPointsEarned: 427,
  totalPointsPossible: 500,
  gradesByCourse: {
    course1: {
      courseName: 'Mathematics 101',
      assignments: [
        { _id: 'a1', title: 'Homework 1', grade: 85, pointValue: 100, isGraded: true },
        { _id: 'a2', title: 'Quiz 1', grade: 90, pointValue: 50, isGraded: true },
        { _id: 'a3', title: 'Homework 2', grade: null, pointValue: 100, isGraded: false }
      ],
      averagePercentage: 87.5,
      totalPointsEarned: 175,
      totalPointsPossible: 250
    },
    course2: {
      courseName: 'Physics 101',
      assignments: [
        { _id: 'a4', title: 'Lab Report 1', grade: 92, pointValue: 150, isGraded: true },
        { _id: 'a5', title: 'Problem Set 1', grade: 80, pointValue: 100, isGraded: true }
      ],
      averagePercentage: 83.2,
      totalPointsEarned: 252,
      totalPointsPossible: 250
    }
  }
};

// Mock useAuth hook
vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: true })
}));

const renderWithAuth = (component) => {
  return render(component);
};

describe('AssignmentProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignmentService.getStudentGrades.mockResolvedValue({ data: mockProgressData });
  });

  describe('Compact View', () => {
    it('renders compact progress view', async () => {
      renderWithAuth(<AssignmentProgress compact={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Progress')).toBeInTheDocument();
        expect(screen.getByText('86%')).toBeInTheDocument(); // Rounded average
        expect(screen.getByText('5')).toBeInTheDocument(); // Completed count
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Graded')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('displays progress bar with correct percentage', async () => {
      renderWithAuth(<AssignmentProgress compact={true} />);
      
      await waitFor(() => {
        const progressFill = document.querySelector('.progress-fill');
        expect(progressFill).toHaveStyle({ width: '85.39999999999999%' }); // 427/500 * 100
        expect(screen.getByText('427/500 points')).toBeInTheDocument();
      });
    });

    it('shows correct grade color for high percentage', async () => {
      renderWithAuth(<AssignmentProgress compact={true} />);
      
      await waitFor(() => {
        const gradeBadge = screen.getByText('86%');
        expect(gradeBadge).toHaveClass('grade-b'); // 85.5% should be grade-b
      });
    });
  });

  describe('Full View', () => {
    it('renders full progress view', async () => {
      renderWithAuth(<AssignmentProgress compact={false} />);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Progress Overview')).toBeInTheDocument();
        expect(screen.getByText('Overall Grade:')).toBeInTheDocument();
        expect(screen.getByText('86%')).toBeInTheDocument();
        expect(screen.getByText('Total Assignments')).toBeInTheDocument();
        expect(screen.getByText('Points Summary')).toBeInTheDocument();
      });
    });

    it('displays summary cards with correct counts', async () => {
      renderWithAuth(<AssignmentProgress compact={false} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('5')).toHaveLength(2); // Total assignments and completed
        expect(screen.getByText('4')).toBeInTheDocument(); // Graded (4 assignments have grades)
        expect(screen.getByText('1')).toBeInTheDocument(); // Pending (1 assignment without grade)
      });
    });

    it('shows course breakdown when multiple courses exist', async () => {
      renderWithAuth(<AssignmentProgress compact={false} />);
      
      await waitFor(() => {
        expect(screen.getByText('Course Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Mathematics 101')).toBeInTheDocument();
        expect(screen.getByText('Physics 101')).toBeInTheDocument();
        expect(screen.getByText('3 assignments')).toBeInTheDocument();
        expect(screen.getByText('2 assignments')).toBeInTheDocument();
      });
    });

    it('displays points summary with progress bar', async () => {
      renderWithAuth(<AssignmentProgress compact={false} />);
      
      await waitFor(() => {
        expect(screen.getByText('427 out of 500 points earned (85%)')).toBeInTheDocument();
        const pointsBar = document.querySelector('.points-earned');
        expect(pointsBar).toHaveStyle({ width: '85.39999999999999%' });
      });
    });
  });

  describe('Course Filtering', () => {
    it('filters data by course when courseId is provided', async () => {
      renderWithAuth(<AssignmentProgress courseId="course1" />);
      
      await waitFor(() => {
        // Should only show data for course1
        expect(screen.getAllByText('3')).toHaveLength(2); // Total assignments and completed for course1
        expect(screen.queryByText('Physics 101')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when course has no assignments', async () => {
      renderWithAuth(<AssignmentProgress courseId="nonexistent" />);
      
      await waitFor(() => {
        expect(screen.getByText('No assignment data available')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state while fetching data', () => {
      assignmentService.getStudentGrades.mockImplementation(() => new Promise(() => {}));
      
      renderWithAuth(<AssignmentProgress />);
      
      expect(screen.getByText('Loading progress...')).toBeInTheDocument();
    });

    it('displays error state when fetch fails', async () => {
      assignmentService.getStudentGrades.mockRejectedValue(new Error('Network error'));
      
      renderWithAuth(<AssignmentProgress />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load progress data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('retries fetching data when retry button is clicked', async () => {
      assignmentService.getStudentGrades
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockProgressData });
      
      renderWithAuth(<AssignmentProgress />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load progress data')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Progress Overview')).toBeInTheDocument();
      });
      
      expect(assignmentService.getStudentGrades).toHaveBeenCalledTimes(2);
    });

    it('shows empty state when no assignments exist', async () => {
      assignmentService.getStudentGrades.mockResolvedValue({ 
        data: { totalAssignments: 0, gradesByCourse: {} } 
      });
      
      renderWithAuth(<AssignmentProgress />);
      
      await waitFor(() => {
        expect(screen.getByText('No assignment data available')).toBeInTheDocument();
      });
    });
  });

  describe('Grade Color Coding', () => {
    it('applies correct grade colors based on percentage', async () => {
      const testCases = [
        { percentage: 95, expectedClass: 'grade-a' },
        { percentage: 85, expectedClass: 'grade-b' },
        { percentage: 75, expectedClass: 'grade-c' },
        { percentage: 65, expectedClass: 'grade-d' },
        { percentage: 55, expectedClass: 'grade-f' }
      ];

      for (const testCase of testCases) {
        const dataWithPercentage = {
          ...mockProgressData,
          averagePercentage: testCase.percentage
        };
        
        assignmentService.getStudentGrades.mockResolvedValue({ data: dataWithPercentage });
        
        const { unmount } = renderWithAuth(<AssignmentProgress compact={true} />);
        
        await waitFor(() => {
          const gradeBadge = screen.getByText(`${Math.round(testCase.percentage)}%`);
          expect(gradeBadge).toHaveClass(testCase.expectedClass);
        });
        
        unmount();
      }
    });
  });
});