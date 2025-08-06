import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CourseCatalog from '../CourseCatalog';
import * as courseService from '../../services/courseService';

// Mock the course service
vi.mock('../../services/courseService');

// Mock CourseList component
vi.mock('../../components/CourseList', () => ({
  default: ({ courses, loading, error, onEnrollmentChange, emptyMessage }) => {
    if (loading) return <div>Loading courses...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!courses || courses.length === 0) return <div>{emptyMessage}</div>;
    
    return (
      <div data-testid="course-list">
        {courses.map(course => (
          <div key={course._id} data-testid={`course-${course._id}`}>
            <h3>{course.name}</h3>
            <p>{course.subject}</p>
            <button onClick={() => onEnrollmentChange?.(course._id, true)}>
              Enroll
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
    description: 'Learn React basics',
    teacher: { name: 'John Doe' }
  },
  {
    _id: '2',
    name: 'Advanced JavaScript',
    subject: 'Computer Science',
    description: 'Master JavaScript concepts',
    teacher: { name: 'Jane Smith' }
  },
  {
    _id: '3',
    name: 'Calculus I',
    subject: 'Mathematics',
    description: 'Introduction to calculus',
    teacher: { name: 'Bob Wilson' }
  }
];

const renderCourseCatalog = () => {
  return render(
    <BrowserRouter>
      <CourseCatalog />
    </BrowserRouter>
  );
};

describe('CourseCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header correctly', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: [] });

    renderCourseCatalog();

    expect(screen.getByText('Course Catalog')).toBeInTheDocument();
    expect(screen.getByText('Browse and enroll in available courses')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    courseService.getAvailableCourses.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    renderCourseCatalog();

    expect(screen.getByText('Loading courses...')).toBeInTheDocument();
  });

  it('displays courses after loading', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByTestId('course-list')).toBeInTheDocument();
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Calculus I')).toBeInTheDocument();
    });
  });

  it('filters courses by search term', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search courses...');
      fireEvent.change(searchInput, { target: { value: 'React' } });
    });

    // Should only show React course
    expect(screen.getByTestId('course-1')).toBeInTheDocument();
    expect(screen.queryByTestId('course-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('course-3')).not.toBeInTheDocument();
  });

  it('filters courses by subject', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByTestId('course-list')).toBeInTheDocument();
    });

    const subjectFilter = screen.getByDisplayValue('All Subjects');
    fireEvent.change(subjectFilter, { target: { value: 'Mathematics' } });

    // Should only show Mathematics course
    expect(screen.getByTestId('course-3')).toBeInTheDocument();
    expect(screen.queryByTestId('course-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('course-2')).not.toBeInTheDocument();
  });

  it('displays correct course count', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByText('3 courses found')).toBeInTheDocument();
    });
  });

  it('updates course count when filtering', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByText('3 courses found')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search courses...');
    fireEvent.change(searchInput, { target: { value: 'JavaScript' } });

    expect(screen.getByText('1 course found')).toBeInTheDocument();
  });

  it('handles enrollment change by removing course from list', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      const enrollButton = screen.getAllByText('Enroll')[0];
      fireEvent.click(enrollButton);
    });

    // Course should be removed from available courses
    expect(screen.queryByTestId('course-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('course-2')).toBeInTheDocument();
    expect(screen.getByTestId('course-3')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    const errorMessage = 'Failed to load available courses';
    courseService.getAvailableCourses.mockRejectedValue({
      error: { message: errorMessage }
    });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('shows empty message when no courses available', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: [] });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByText('No courses available for enrollment')).toBeInTheDocument();
    });
  });

  it('populates subject filter options correctly', async () => {
    courseService.getAvailableCourses.mockResolvedValue({ data: mockCourses });

    renderCourseCatalog();

    await waitFor(() => {
      expect(screen.getByTestId('course-list')).toBeInTheDocument();
    });

    // Check that unique subjects are available as options in the select
    const subjectFilter = screen.getByDisplayValue('All Subjects');
    const options = subjectFilter.querySelectorAll('option');
    const optionTexts = Array.from(options).map(option => option.textContent);
    
    expect(optionTexts).toContain('Computer Science');
    expect(optionTexts).toContain('Mathematics');
  });
});