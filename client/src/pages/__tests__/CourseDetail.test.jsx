import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CourseDetail from '../CourseDetail';
import * as courseService from '../../services/courseService';

// Mock the course service
vi.mock('../../services/courseService');

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
const mockCourseId = 'course123';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ courseId: mockCourseId }),
  };
});

const mockCourse = {
  _id: 'course123',
  name: 'Introduction to React',
  subject: 'Computer Science',
  description: 'Learn the fundamentals of React development including components, state, and props.',
  teacher: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  enrolledStudents: [
    { _id: '1', name: 'Student 1' },
    { _id: '2', name: 'Student 2' }
  ],
  materials: [
    {
      name: 'React Basics Slides',
      uploadDate: '2024-01-15T10:00:00Z'
    },
    {
      name: 'Component Examples',
      uploadDate: '2024-01-20T14:30:00Z'
    }
  ]
};

const renderCourseDetail = () => {
  return render(
    <BrowserRouter>
      <CourseDetail />
    </BrowserRouter>
  );
};

describe('CourseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    courseService.getCourse.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    renderCourseDetail();

    expect(screen.getByText('Loading course details...')).toBeInTheDocument();
  });

  it('fetches course details with correct course ID', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      expect(courseService.getCourse).toHaveBeenCalledWith(mockCourseId);
    });
  });

  it('displays course information correctly', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Instructor: John Doe')).toBeInTheDocument();
      expect(screen.getByText('2 students enrolled')).toBeInTheDocument();
      expect(screen.getByText('Learn the fundamentals of React development including components, state, and props.')).toBeInTheDocument();
    });
  });

  it('displays course materials when available', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Course Materials')).toBeInTheDocument();
      expect(screen.getByText('React Basics Slides')).toBeInTheDocument();
      expect(screen.getByText('Component Examples')).toBeInTheDocument();
      expect(screen.getByText('Uploaded: 1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('Uploaded: 1/20/2024')).toBeInTheDocument();
    });
  });

  it('shows no materials message when materials array is empty', async () => {
    const courseWithoutMaterials = { ...mockCourse, materials: [] };
    courseService.getCourse.mockResolvedValue({ data: courseWithoutMaterials });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('No course materials available yet.')).toBeInTheDocument();
    });
  });

  it('displays assignments placeholder section', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Assignments')).toBeInTheDocument();
      expect(screen.getByText('Assignment list will be displayed here.')).toBeInTheDocument();
      expect(screen.getByText('View All Assignments')).toBeInTheDocument();
    });
  });

  it('displays announcements placeholder section', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Announcements')).toBeInTheDocument();
      expect(screen.getByText('Course announcements will be displayed here.')).toBeInTheDocument();
    });
  });

  it('navigates back to courses when back button is clicked', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      const backButton = screen.getByText('← Back to Courses');
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/student/courses');
    });
  });

  it('navigates to assignments with course filter when View All Assignments is clicked', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      const viewAssignmentsButton = screen.getByText('View All Assignments');
      fireEvent.click(viewAssignmentsButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/student/assignments?course=${mockCourseId}`);
    });
  });

  it('displays error message on fetch failure', async () => {
    const errorMessage = 'Failed to load course details';
    courseService.getCourse.mockRejectedValue({
      error: { message: errorMessage }
    });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Back to Courses')).toBeInTheDocument();
    });
  });

  it('displays not found message when course is null', async () => {
    courseService.getCourse.mockResolvedValue({ data: null });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Course not found')).toBeInTheDocument();
      expect(screen.getByText('Back to Courses')).toBeInTheDocument();
    });
  });

  it('handles missing teacher information gracefully', async () => {
    const courseWithoutTeacher = { ...mockCourse, teacher: null };
    courseService.getCourse.mockResolvedValue({ data: courseWithoutTeacher });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Instructor: Unknown')).toBeInTheDocument();
    });
  });

  it('handles missing enrolled students gracefully', async () => {
    const courseWithoutStudents = { ...mockCourse, enrolledStudents: null };
    courseService.getCourse.mockResolvedValue({ data: courseWithoutStudents });

    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('0 students enrolled')).toBeInTheDocument();
    });
  });

  it('renders download buttons for materials', async () => {
    courseService.getCourse.mockResolvedValue({ data: mockCourse });

    renderCourseDetail();

    await waitFor(() => {
      const downloadButtons = screen.getAllByText('Download');
      expect(downloadButtons).toHaveLength(2);
    });
  });
});