import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, mockUsers } from '../../test/utils';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext } from '../../context/AuthContext';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }) => {
      mockNavigate(to, { replace });
      return <div data-testid="navigate">Redirecting to {to}</div>;
    },
    useLocation: () => ({ pathname: '/protected' })
  };
});

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderWithAuth = (authState) => {
  return renderWithProviders(
    <AuthContext.Provider value={authState}>
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    </AuthContext.Provider>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading when authentication is being checked', () => {
    const authState = {
      isAuthenticated: false,
      user: null,
      loading: true,
      error: null
    };

    renderWithAuth(authState);

    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    const authState = {
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    };

    renderWithAuth(authState);

    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /login');
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('should redirect to login when user is null', () => {
    const authState = {
      isAuthenticated: true,
      user: null,
      loading: false,
      error: null
    };

    renderWithAuth(authState);

    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /login');
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('should render children when authenticated and no role required', () => {
    const authState = {
      isAuthenticated: true,
      user: mockUsers.student,
      loading: false,
      error: null
    };

    renderWithAuth(authState);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('should render children when user has required role', () => {
    const authState = {
      isAuthenticated: true,
      user: mockUsers.student,
      loading: false,
      error: null
    };

    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <ProtectedRoute requiredRole="Student">
          <TestComponent />
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should redirect when user does not have required role', () => {
    const authState = {
      isAuthenticated: true,
      user: mockUsers.student,
      loading: false,
      error: null
    };

    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <ProtectedRoute requiredRole="Teacher">
          <TestComponent />
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /student/dashboard');
    expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard', { replace: true });
  });

  it('should render children when user role is in allowed roles', () => {
    const authState = {
      isAuthenticated: true,
      user: mockUsers.teacher,
      loading: false,
      error: null
    };

    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
          <TestComponent />
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should redirect when user role is not in allowed roles', () => {
    const authState = {
      isAuthenticated: true,
      user: mockUsers.student,
      loading: false,
      error: null
    };

    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
          <TestComponent />
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /student/dashboard');
  });

  it('should redirect admin to admin dashboard when accessing wrong role', () => {
    const authState = {
      isAuthenticated: true,
      user: mockUsers.admin,
      loading: false,
      error: null
    };

    renderWithProviders(
      <AuthContext.Provider value={authState}>
        <ProtectedRoute requiredRole="Student">
          <TestComponent />
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /admin/dashboard');
  });
});