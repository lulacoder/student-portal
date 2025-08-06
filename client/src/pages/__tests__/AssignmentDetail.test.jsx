import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AssignmentDetail from '../AssignmentDetail.jsx';
import * as assignmentService from '../../services/assignmentService.js';
import { AuthProvider } from '../../context/AuthProvider.jsx';

// Mock the services
vi.mock('../../services/assignmentService.js', () => ({
    getAssignment: vi.fn(),
    submitAssignment: vi.fn(),
    downloadFile: vi.fn()
}));

// Mock useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ assignmentId: 'assignment1' }),
        useNavigate: () => mockNavigate
    };
});

const mockUser = {
    id: 'student1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Student'
};

const mockAssignment = {
    _id: 'assignment1',
    title: 'Math Homework 1',
    description: 'Complete exercises 1-10 from chapter 1.\nShow all work clearly.',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    pointValue: 100,
    isActive: true,
    course: {
        _id: 'course1',
        name: 'Mathematics 101'
    },
    attachments: [
        {
            name: 'homework_template.pdf',
            fileId: {
                _id: 'file1',
                originalName: 'homework_template.pdf'
            }
        }
    ],
    submission: null
};

const mockSubmittedAssignment = {
    ...mockAssignment,
    submission: {
        _id: 'submission1',
        submittedAt: new Date().toISOString(),
        isLate: false,
        isGraded: true,
        grade: 85,
        feedback: 'Good work! Minor errors in problem 3.',
        submissionText: 'Here are my solutions to the homework problems.',
        attachments: [
            {
                name: 'my_homework.pdf',
                fileId: {
                    _id: 'file2',
                    originalName: 'my_homework.pdf'
                }
            }
        ]
    }
};

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
                {component}
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('AssignmentDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders assignment details correctly', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('Math Homework 1')).toBeInTheDocument();
            expect(screen.getByText('Mathematics 101')).toBeInTheDocument();
            expect(screen.getByText('Worth 100 points')).toBeInTheDocument();
            expect(screen.getByText(/Complete exercises 1-10 from chapter 1/)).toBeInTheDocument();
            expect(screen.getByText(/Show all work clearly/)).toBeInTheDocument();
        });
    });

    it('displays due date with proper formatting', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('Due Date')).toBeInTheDocument();
            // Due date should be formatted as a full date
            expect(screen.getByText(/2024|2025/)).toBeInTheDocument();
        });
    });

    it('shows assignment attachments with download buttons', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('Assignment Files')).toBeInTheDocument();
            expect(screen.getByText('homework_template.pdf')).toBeInTheDocument();
            expect(screen.getByText('Download')).toBeInTheDocument();
        });
    });

    it('displays submission form for unsubmitted assignment', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('Submit Assignment')).toBeInTheDocument();
            expect(screen.getByLabelText('Submission Text')).toBeInTheDocument();
            expect(screen.getByText('File Attachments')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /submit assignment/i })).toBeInTheDocument();
        });
    });

    it('displays existing submission details', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockSubmittedAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('Your Submission')).toBeInTheDocument();
            expect(screen.getByText('Grade: 85/100')).toBeInTheDocument();
            expect(screen.getByText('Good work! Minor errors in problem 3.')).toBeInTheDocument();
            expect(screen.getByText('Here are my solutions to the homework problems.')).toBeInTheDocument();
            expect(screen.getByText('my_homework.pdf')).toBeInTheDocument();
        });
    });

    it('handles assignment submission', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });
        assignmentService.submitAssignment.mockResolvedValue({
            data: { message: 'Assignment submitted successfully' }
        });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            const textArea = screen.getByLabelText('Submission Text');
            fireEvent.change(textArea, { target: { value: 'My submission text' } });

            const submitButton = screen.getByRole('button', { name: /submit assignment/i });
            fireEvent.click(submitButton);
        });

        expect(assignmentService.submitAssignment).toHaveBeenCalledWith(
            'assignment1',
            expect.any(FormData)
        );
    });

    it('shows error when submission fails', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });
        assignmentService.submitAssignment.mockRejectedValue({
            response: { data: { error: { message: 'Submission failed' } } }
        });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            const textArea = screen.getByLabelText('Submission Text');
            fireEvent.change(textArea, { target: { value: 'My submission text' } });

            const submitButton = screen.getByRole('button', { name: /submit assignment/i });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText('Submission failed')).toBeInTheDocument();
        });
    });

    it('prevents submission without content', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            const submitButton = screen.getByRole('button', { name: /submit assignment/i });
            fireEvent.click(submitButton);

            expect(screen.getByText('Please provide either submission text or upload files')).toBeInTheDocument();
        });
    });

    it('shows overdue warning for past due assignments', async () => {
        const overdueAssignment = {
            ...mockAssignment,
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        };

        assignmentService.getAssignment.mockResolvedValue({ data: overdueAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('(Overdue)')).toBeInTheDocument();
            expect(screen.getByText('This assignment is no longer accepting submissions.')).toBeInTheDocument();
        });
    });

    it('shows resubmission option for submitted assignments before due date', async () => {
        const resubmittableAssignment = {
            ...mockSubmittedAssignment,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1 day from now
        };

        assignmentService.getAssignment.mockResolvedValue({ data: resubmittableAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getAllByText('Resubmit Assignment')).toHaveLength(2); // Header and button
            expect(screen.getByText(/you can resubmit this assignment/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /resubmit assignment/i })).toBeInTheDocument();
        });
    });

    it('navigates back to assignments list', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            const backButton = screen.getByText('← Back to Assignments');
            fireEvent.click(backButton);
            expect(mockNavigate).toHaveBeenCalledWith('/student/assignments');
        });
    });

    it('handles file download', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: mockAssignment });
        assignmentService.downloadFile.mockResolvedValue({
            data: new Blob(['file content'])
        });

        // Mock URL.createObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:url');
        global.URL.revokeObjectURL = vi.fn();

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            const downloadButton = screen.getByText('Download');
            fireEvent.click(downloadButton);
        });

        expect(assignmentService.downloadFile).toHaveBeenCalledWith('file1');
    });

    it('displays loading spinner while fetching assignment', () => {
        assignmentService.getAssignment.mockImplementation(() => new Promise(() => { }));

        renderWithProviders(<AssignmentDetail />);

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows error state when assignment not found', async () => {
        assignmentService.getAssignment.mockResolvedValue({ data: null });

        renderWithProviders(<AssignmentDetail />);

        await waitFor(() => {
            expect(screen.getByText('Assignment not found')).toBeInTheDocument();
            expect(screen.getByText('Back to Assignments')).toBeInTheDocument();
        });
    });
});