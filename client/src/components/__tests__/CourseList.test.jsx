import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CourseList from '../CourseList';

// Mock CourseCard component
vi.mock('../CourseCard', () => ({
  default: ({ course, isEnrolled, onEnrollmentChange }) => (
    <div data-testid={`course-card-${course._id}`}>
      <h3>{course.name}</h3>
      <p>{isEnrolled ? 'Enrolled' : 'Not Enrolled'}</p>
      <button onClick={() => onEnrollmentChange?.(course._id, !isEnrolled)}>
        {isEnrolled ? 'Unenroll' : 'Enroll'}
      </button>
    </div>
  )
}));

const mockCourses = [
  {
    _id: '1',
    name: 'Introduction to React',
    subject: 'Computer Science',
    description: 'Learn React basics'
  },
  {
    _id: '2',
    name: 'Advanced JavaScript',
    subject: 'Computer Science',
    description: 'Master JavaScript concepts'
  }
];

const renderCourseList = (props = {}) => {
  const defaultProps = {
    courses: mockCourses,
    loading: false,
    error: '',
    isEnrolledView: false,
    onEnrollmentChange: vi.fn(),
    emptyMessage: 'No courses available',
    ...props
  };

  return render(
    <BrowserRouter>
      <CourseList {...defaultProps} />
    </BrowserRouter>
  );
};

describe('CourseList', () => {
  it('renders courses correctly', () => {
    renderCourseList();

    expect(screen.getByTestId('course-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('course-card-2')).toBeInTheDocument();
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderCourseList({ loading: true, courses: [] });

    expect(screen.getByText('Loading courses...')).toBeInTheDocument();
    expect(screen.queryByTestId('course-card-1')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load courses';
    renderCourseList({ error: errorMessage, courses: [] });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByTestId('course-card-1')).not.toBeInTheDocument();
  });

  it('shows empty state with custom message', () => {
    const emptyMessage = 'No courses found';
    renderCourseList({ 
      courses: [], 
      loading: false, 
      error: '', 
      emptyMessage 
    });

    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('passes correct props to CourseCard components', () => {
    const mockOnEnrollmentChange = vi.fn();
    renderCourseList({ 
      isEnrolledView: true, 
      onEnrollmentChange: mockOnEnrollmentChange 
    });

    // Check that enrolled status is passed correctly
    expect(screen.getAllByText('Enrolled')).toHaveLength(2);
  });

  it('handles enrollment change callback', () => {
    const mockOnEnrollmentChange = vi.fn();
    renderCourseList({ onEnrollmentChange: mockOnEnrollmentChange });

    const enrollButton = screen.getAllByText('Enroll')[0];
    enrollButton.click();

    expect(mockOnEnrollmentChange).toHaveBeenCalledWith('1', true);
  });
});