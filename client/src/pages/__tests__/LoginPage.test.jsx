import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUsers, mockToken } from '../../test/utils';
import LoginPage from '../LoginPage';
import api from '../../services/api';

// Mock the API
vi.mock('../../services/api');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null })
  };
});

describe('LoginPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /login to student portal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const form = screen.getByRole('form');

    await user.type(emailInput, 'invalid-email');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters long/i)).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: mockUsers.student,
        token: mockToken
      }
    });

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'student@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'student@test.com',
        password: 'password123'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard', { replace: true });
    });
  });

  it('should handle login error', async () => {
    const errorMessage = 'Invalid credentials';
    api.post.mockRejectedValueOnce({
      response: {
        data: { message: errorMessage }
      }
    });

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'student@test.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should clear validation errors when user starts typing', async () => {
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const form = screen.getByRole('form');

    // Trigger validation error
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    // Start typing to clear error
    await user.type(emailInput, 'test');
    
    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });

  it('should disable form during submission', async () => {
    api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'student@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});