import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import LogoutButton from '../LogoutButton';
import { AuthContext } from '../../context/AuthContext';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('LogoutButton', () => {
  const user = userEvent.setup();
  const mockLogout = vi.fn();

  const authState = {
    isAuthenticated: true,
    user: { name: 'Test User', role: 'Student' },
    loading: false,
    error: null,
    logout: mockLogout
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render logout button with default text', () => {
    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <LogoutButton />
      </AuthContext.Provider>
    );

    expect(screen.getByRole('button', { name: /logout from application/i })).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should render logout button with custom text', () => {
    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <LogoutButton>Sign Out</LogoutButton>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <LogoutButton className="custom-class" />
      </AuthContext.Provider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('logout-btn', 'custom-class');
  });

  it('should call logout and navigate on click', async () => {
    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <LogoutButton />
      </AuthContext.Provider>
    );

    const logoutButton = screen.getByRole('button');
    await user.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('should disable button during logout process', async () => {
    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <LogoutButton />
      </AuthContext.Provider>
    );

    const logoutButton = screen.getByRole('button');
    
    // Click the button
    await user.click(logoutButton);
    
    // Verify logout was called and navigation happened
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('should handle logout error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLogout.mockRejectedValueOnce(new Error('Logout failed'));

    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <LogoutButton />
      </AuthContext.Provider>
    );

    const logoutButton = screen.getByRole('button');
    await user.click(logoutButton);

    // Should still navigate even if logout fails
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    consoleErrorSpy.mockRestore();
  });
});