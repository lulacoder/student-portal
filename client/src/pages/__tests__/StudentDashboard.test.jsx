import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import StudentDashboard from '../StudentDashboard';
import * as courseService from '../../services/courseService';

// Mock the course service
vi.mock('../../services/courseService');

// Mock useAuth hook
const mockUser = { name: 'John Student', role: 'Student' };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCourses = [
  {
    _id: '1',
    name: 'Introduction to React',
    subject: 'Computer Science',
    teacher: { name: 'John Doe' }
  },
  {
    _id: '2',
    name: 'Advanced JavaScript',
    subject: 'Computer Science',
    teacher: { name: 'Jane Smith' }
  }
];

const renderStudentDashboard = () => {
  return render(
    <BrowserRouter>
      <StudentDashboard />
    </BrowserRouter>
  );
};

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message with user name', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: [] });

    renderStudentDashboard();

    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, John Student!')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    courseService.getEnrolledCourses.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    renderStudentDashboard();

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('displays enrolled courses count', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentDashboard();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
    });
  });

  it('shows recent courses section when courses exist', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recent Courses')).toBeInTheDocument();
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
    });
  });

  it('shows empty state when no courses enrolled', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: [] });

    renderStudentDashboard();

    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument();
      expect(screen.getByText(/You haven't enrolled in any courses yet/)).toBeInTheDocument();
      expect(screen.getByText('Browse Course Catalog')).toBeInTheDocument();
    });
  });

  it('displays error message on fetch failure', async () => {
    const errorMessage = 'Failed to load dashboard data';
    courseService.getEnrolledCourses.mockRejectedValue({
      error: { message: errorMessage }
    });

    renderStudentDashboard();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('navigates to courses page when My Courses card is clicked', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentDashboard();

    await waitFor(() => {
      const viewCoursesButton = screen.getByText('View Courses');
      viewCoursesButton.click();
      expect(mockNavigate).toHaveBeenCalledWith('/student/courses');
    });
  });

  it('navigates to course catalog when Browse Course Catalog is clicked', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: [] });

    renderStudentDashboard();

    await waitFor(() => {
      const browseCatalogButton = screen.getByText('Browse Course Catalog');
      browseCatalogButton.click();
      expect(mockNavigate).toHaveBeenCalledWith('/student/catalog');
    });
  });

  it('limits recent courses to 3 items', async () => {
    const manyCourses = Array.from({ length: 5 }, (_, i) => ({
      _id: `${i + 1}`,
      name: `Course ${i + 1}`,
      subject: 'Computer Science',
      teacher: { name: `Teacher ${i + 1}` }
    }));

    courseService.getEnrolledCourses.mockResolvedValue({ data: manyCourses });

    renderStudentDashboard();

    await waitFor(() => {
      // Should only show first 3 courses in recent section
      expect(screen.getByText('Course 1')).toBeInTheDocument();
      expect(screen.getByText('Course 2')).toBeInTheDocument();
      expect(screen.getByText('Course 3')).toBeInTheDocument();
      expect(screen.queryByText('Course 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Course 5')).not.toBeInTheDocument();
    });
  });
});