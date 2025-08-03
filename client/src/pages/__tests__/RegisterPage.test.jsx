import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUsers, mockToken } from '../../test/utils';
import RegisterPage from '../RegisterPage';
import api from '../../services/api';

// Mock the API
vi.mock('../../services/api');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('RegisterPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render registration form', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /register for student portal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty required fields', async () => {
    renderWithProviders(<RegisterPage />);

    const form = screen.getByRole('form');
    const submitButton = screen.getByRole('button', { name: /register/i });
    
    // Prevent default form submission to trigger our validation
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    renderWithProviders(<RegisterPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const form = screen.getByRole('form');

    await user.type(emailInput, 'invalid-email');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short name', async () => {
    renderWithProviders(<RegisterPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const form = screen.getByRole('form');

    await user.type(nameInput, 'A');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters long/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for password mismatch', async () => {
    renderWithProviders(<RegisterPage />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const form = screen.getByRole('form');

    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'different123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should show student ID field when Student role is selected', async () => {
    renderWithProviders(<RegisterPage />);

    const roleSelect = screen.getByLabelText(/role/i);
    await user.selectOptions(roleSelect, 'Student');

    expect(screen.getByLabelText(/student id/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/teacher credentials/i)).not.toBeInTheDocument();
  });

  it('should show teacher credentials field when Teacher role is selected', async () => {
    renderWithProviders(<RegisterPage />);

    const roleSelect = screen.getByLabelText(/role/i);
    await user.selectOptions(roleSelect, 'Teacher');

    expect(screen.getByLabelText(/teacher credentials/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/student id/i)).not.toBeInTheDocument();
  });

  it('should handle successful registration', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: mockUsers.student,
        token: mockToken
      }
    });

    renderWithProviders(<RegisterPage />);

    // Fill out the form
    await user.type(screen.getByLabelText(/full name/i), 'John Student');
    await user.type(screen.getByLabelText(/email/i), 'student@test.com');
    await user.selectOptions(screen.getByLabelText(/role/i), 'Student');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'John Student',
        email: 'student@test.com',
        password: 'password123',
        role: 'Student'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard', { replace: true });
    });
  });

  it('should include student ID in registration data when provided', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: mockUsers.student,
        token: mockToken
      }
    });

    renderWithProviders(<RegisterPage />);

    // Fill out the form with student ID
    await user.type(screen.getByLabelText(/full name/i), 'John Student');
    await user.type(screen.getByLabelText(/email/i), 'student@test.com');
    await user.selectOptions(screen.getByLabelText(/role/i), 'Student');
    await user.type(screen.getByLabelText(/student id/i), 'STU123');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'John Student',
        email: 'student@test.com',
        password: 'password123',
        role: 'Student',
        studentId: 'STU123'
      });
    });
  });

  it('should handle registration error', async () => {
    const errorMessage = 'Email already exists';
    api.post.mockRejectedValueOnce({
      response: {
        data: { message: errorMessage }
      }
    });

    renderWithProviders(<RegisterPage />);

    // Fill out valid form
    await user.type(screen.getByLabelText(/full name/i), 'John Student');
    await user.type(screen.getByLabelText(/email/i), 'existing@test.com');
    await user.selectOptions(screen.getByLabelText(/role/i), 'Student');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should clear validation errors when user starts typing', async () => {
    renderWithProviders(<RegisterPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const form = screen.getByRole('form');

    // Trigger validation error
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    });

    // Start typing to clear error
    await user.type(nameInput, 'John');
    
    await waitFor(() => {
      expect(screen.queryByText(/full name is required/i)).not.toBeInTheDocument();
    });
  });
});