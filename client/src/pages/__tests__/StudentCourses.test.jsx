import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import StudentCourses from '../StudentCourses';
import * as courseService from '../../services/courseService';

// Mock the course service
vi.mock('../../services/courseService');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock CourseList component
vi.mock('../../components/CourseList', () => ({
  default: ({ courses, loading, error, isEnrolledView, onEnrollmentChange, emptyMessage }) => {
    if (loading) return <div>Loading courses...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!courses || courses.length === 0) return <div>{emptyMessage}</div>;
    
    return (
      <div data-testid="course-list">
        <div data-testid="enrolled-view">{isEnrolledView ? 'true' : 'false'}</div>
        {courses.map(course => (
          <div key={course._id} data-testid={`course-${course._id}`}>
            <h3>{course.name}</h3>
            <button onClick={() => onEnrollmentChange?.(course._id, false)}>
              Unenroll
            </button>
          </div>
        ))}
      </div>
    );
  }
}));

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

const renderStudentCourses = () => {
  return render(
    <BrowserRouter>
      <StudentCourses />
    </BrowserRouter>
  );
};

describe('StudentCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header correctly', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: [] });

    renderStudentCourses();

    expect(screen.getByText('My Courses')).toBeInTheDocument();
    expect(screen.getByText('Manage your enrolled courses')).toBeInTheDocument();
    expect(screen.getByText('Browse Course Catalog')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    courseService.getEnrolledCourses.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    renderStudentCourses();

    expect(screen.getByText('Loading courses...')).toBeInTheDocument();
  });

  it('displays enrolled courses count', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentCourses();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
    });
  });

  it('displays enrolled courses', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentCourses();

    await waitFor(() => {
      expect(screen.getByTestId('course-list')).toBeInTheDocument();
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
    });
  });

  it('passes isEnrolledView as true to CourseList', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentCourses();

    await waitFor(() => {
      expect(screen.getByTestId('enrolled-view')).toHaveTextContent('true');
    });
  });

  it('navigates to course catalog when Browse Course Catalog is clicked', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: [] });

    renderStudentCourses();

    await waitFor(() => {
      const browseCatalogButton = screen.getByText('Browse Course Catalog');
      fireEvent.click(browseCatalogButton);
      expect(mockNavigate).toHaveBeenCalledWith('/student/catalog');
    });
  });

  it('handles unenrollment by removing course from list', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentCourses();

    await waitFor(() => {
      const unenrollButton = screen.getAllByText('Unenroll')[0];
      fireEvent.click(unenrollButton);
    });

    // Course should be removed from enrolled courses
    expect(screen.queryByTestId('course-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('course-2')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    const errorMessage = 'Failed to load enrolled courses';
    courseService.getEnrolledCourses.mockRejectedValue({
      error: { message: errorMessage }
    });

    renderStudentCourses();

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('shows empty message when no courses enrolled', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: [] });

    renderStudentCourses();

    await waitFor(() => {
      expect(screen.getByText(/You are not enrolled in any courses yet/)).toBeInTheDocument();
    });
  });

  it('updates course count when course is unenrolled', async () => {
    courseService.getEnrolledCourses.mockResolvedValue({ data: mockCourses });

    renderStudentCourses();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Unenroll from one course
    const unenrollButton = screen.getAllByText('Unenroll')[0];
    fireEvent.click(unenrollButton);

    // Count should update to 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});