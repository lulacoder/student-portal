import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import StudentAssignments from '../StudentAssignments.jsx';
import * as assignmentService from '../../services/assignmentService.js';
import * as courseService from '../../services/courseService.js';
import { AuthProvider } from '../../context/AuthProvider.jsx';

// Mock the services
vi.mock('../../services/assignmentService.js', () => ({
  getAssignmentsByCourse: vi.fn()
}));
vi.mock('../../services/courseService.js', () => ({
  getCourses: vi.fn()
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()]
  };
});

const mockUser = {
  id: 'student1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Student'
};

const mockCourses = [
  {
    _id: 'course1',
    name: 'Mathematics 101',
    description: 'Basic mathematics course'
  },
  {
    _id: 'course2',
    name: 'Physics 101',
    description: 'Basic physics course'
  }
];

const mockAssignments = [
  {
    _id: 'assignment1',
    title: 'Math Homework 1',
    description: 'Complete exercises 1-10 from chapter 1',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    pointValue: 100,
    submission: null
  },
  {
    _id: 'assignment2',
    title: 'Math Quiz 1',
    description: 'Online quiz covering chapter 1',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    pointValue: 50,
    submission: {
      _id: 'submission1',
      submittedAt: new Date().toISOString(),
      isLate: false,
      isGraded: true,
      grade: 45
    }
  },
  {
    _id: 'assignment3',
    title: 'Overdue Assignment',
    description: 'This assignment is overdue',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    pointValue: 75,
    submission: null
  }
];

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('StudentAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseService.getCourses.mockResolvedValue({ data: mockCourses });
    assignmentService.getAssignmentsByCourse.mockResolvedValue({ data: mockAssignments });
  });

  it('renders assignments page with header', async () => {
    renderWithProviders(<StudentAssignments />);
    
    expect(screen.getByText('My Assignments')).toBeInTheDocument();
    expect(screen.getByText('View and submit your course assignments')).toBeInTheDocument();
  });

  it('loads and displays courses in filter dropdown', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('Filter by Course:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mathematics 101')).toBeInTheDocument();
    });
  });

  it('displays assignments for selected course', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('Math Homework 1')).toBeInTheDocument();
      expect(screen.getByText('Math Quiz 1')).toBeInTheDocument();
      expect(screen.getByText('Overdue Assignment')).toBeInTheDocument();
    });
  });

  it('shows correct status badges for assignments', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument(); // Math Homework 1
      expect(screen.getByText('Graded')).toBeInTheDocument(); // Math Quiz 1
      expect(screen.getByText('Overdue')).toBeInTheDocument(); // Overdue Assignment
    });
  });

  it('displays due dates with relative time', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText(/7 days remaining/)).toBeInTheDocument();
      expect(screen.getByText(/2 days remaining/)).toBeInTheDocument();
      expect(screen.getByText(/2 days overdue/)).toBeInTheDocument();
    });
  });

  it('shows submission information for submitted assignments', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
      expect(screen.getByText('Grade: 45/50')).toBeInTheDocument();
    });
  });

  it('navigates to assignment detail when button is clicked', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      const submitButton = screen.getAllByText('Submit Assignment')[0];
      fireEvent.click(submitButton);
      expect(mockNavigate).toHaveBeenCalledWith('/student/assignments/assignment1');
    });
  });

  it('shows "View Submission" for submitted assignments', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('View Submission')).toBeInTheDocument();
    });
  });

  it('filters assignments when course is changed', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      const courseSelect = screen.getByDisplayValue('Mathematics 101');
      fireEvent.change(courseSelect, { target: { value: 'course2' } });
    });
    
    expect(assignmentService.getAssignmentsByCourse).toHaveBeenCalledWith('course2');
  });

  it('displays empty state when no assignments found', async () => {
    assignmentService.getAssignmentsByCourse.mockResolvedValue({ data: [] });
    
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('No assignments found')).toBeInTheDocument();
      expect(screen.getByText('There are no assignments for the selected course.')).toBeInTheDocument();
    });
  });

  it('displays error message when loading fails', async () => {
    assignmentService.getAssignmentsByCourse.mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load assignments')).toBeInTheDocument();
    });
  });

  it('shows loading spinner while fetching data', () => {
    renderWithProviders(<StudentAssignments />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays point values for assignments', async () => {
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      expect(screen.getByText('Points: 100')).toBeInTheDocument();
      expect(screen.getByText('Points: 50')).toBeInTheDocument();
      expect(screen.getByText('Points: 75')).toBeInTheDocument();
    });
  });

  it('truncates long assignment descriptions', async () => {
    const longDescription = 'A'.repeat(200);
    const assignmentWithLongDesc = {
      ...mockAssignments[0],
      description: longDescription
    };
    
    assignmentService.getAssignmentsByCourse.mockResolvedValue({ 
      data: [assignmentWithLongDesc] 
    });
    
    renderWithProviders(<StudentAssignments />);
    
    await waitFor(() => {
      const truncatedText = screen.getByText(/A{150}\.\.\.$/);
      expect(truncatedText).toBeInTheDocument();
    });
  });
});