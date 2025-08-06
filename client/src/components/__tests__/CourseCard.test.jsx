import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CourseCard from '../CourseCard';
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

const mockCourse = {
  _id: '1',
  name: 'Introduction to React',
  subject: 'Computer Science',
  description: 'Learn the basics of React development',
  teacher: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  enrollmentCount: 25
};

const renderCourseCard = (props = {}) => {
  const defaultProps = {
    course: mockCourse,
    isEnrolled: false,
    onEnrollmentChange: vi.fn(),
    ...props
  };

  return render(
    <BrowserRouter>
      <CourseCard {...defaultProps} />
    </BrowserRouter>
  );
};

describe('CourseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders course information correctly', () => {
    renderCourseCard();

    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Learn the basics of React development')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('shows enroll button for non-enrolled courses', () => {
    renderCourseCard({ isEnrolled: false });

    expect(screen.getByText('Enroll')).toBeInTheDocument();
    expect(screen.queryByText('View Course')).not.toBeInTheDocument();
    expect(screen.queryByText('Unenroll')).not.toBeInTheDocument();
  });

  it('shows view course and unenroll buttons for enrolled courses', () => {
    renderCourseCard({ isEnrolled: true });

    expect(screen.getByText('View Course')).toBeInTheDocument();
    expect(screen.getByText('Unenroll')).toBeInTheDocument();
    expect(screen.queryByText('Enroll')).not.toBeInTheDocument();
  });

  it('handles enrollment successfully', async () => {
    const mockOnEnrollmentChange = vi.fn();
    courseService.enrollInCourse.mockResolvedValue({ success: true });

    renderCourseCard({ 
      isEnrolled: false, 
      onEnrollmentChange: mockOnEnrollmentChange 
    });

    const enrollButton = screen.getByText('Enroll');
    fireEvent.click(enrollButton);

    expect(screen.getByText('Enrolling...')).toBeInTheDocument();

    await waitFor(() => {
      expect(courseService.enrollInCourse).toHaveBeenCalledWith('1');
      expect(mockOnEnrollmentChange).toHaveBeenCalledWith('1', true);
    });
  });

  it('handles unenrollment successfully', async () => {
    const mockOnEnrollmentChange = vi.fn();
    courseService.unenrollFromCourse.mockResolvedValue({ success: true });

    renderCourseCard({ 
      isEnrolled: true, 
      onEnrollmentChange: mockOnEnrollmentChange 
    });

    const unenrollButton = screen.getByText('Unenroll');
    fireEvent.click(unenrollButton);

    expect(screen.getByText('Unenrolling...')).toBeInTheDocument();

    await waitFor(() => {
      expect(courseService.unenrollFromCourse).toHaveBeenCalledWith('1');
      expect(mockOnEnrollmentChange).toHaveBeenCalledWith('1', false);
    });
  });

  it('displays error message on enrollment failure', async () => {
    const errorMessage = 'Enrollment failed';
    courseService.enrollInCourse.mockRejectedValue({
      error: { message: errorMessage }
    });

    renderCourseCard({ isEnrolled: false });

    const enrollButton = screen.getByText('Enroll');
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('navigates to course detail when view course is clicked', () => {
    renderCourseCard({ isEnrolled: true });

    const viewCourseButton = screen.getByText('View Course');
    fireEvent.click(viewCourseButton);

    expect(mockNavigate).toHaveBeenCalledWith('/student/courses/1');
  });

  it('disables buttons during loading', async () => {
    courseService.enrollInCourse.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    renderCourseCard({ isEnrolled: false });

    const enrollButton = screen.getByText('Enroll');
    fireEvent.click(enrollButton);

    expect(enrollButton).toBeDisabled();
    expect(screen.getByText('Enrolling...')).toBeInTheDocument();
  });
});