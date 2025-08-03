import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../../hooks/useAuth';
import { mockUsers, mockToken } from '../../test/utils';

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="isAuthenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <div data-testid="user">{auth.user ? auth.user.name : 'null'}</div>
      <div data-testid="error">{auth.error || 'null'}</div>
      <button onClick={() => auth.login(mockUsers.student, mockToken)}>
        Login
      </button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.setError('Test error')}>Set Error</button>
      <button onClick={() => auth.clearError()}>Clear Error</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should handle login successfully', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('John Student');
    expect(localStorage.setItem).toHaveBeenCalledWith('token', mockToken);
    expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUsers.student));
  });

  it('should handle logout successfully', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // First login
    const loginButton = screen.getByText('Login');
    await act(async () => {
      loginButton.click();
    });

    // Then logout
    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      logoutButton.click();
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
  });

  it('should handle error state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const setErrorButton = screen.getByText('Set Error');
    
    await act(async () => {
      setErrorButton.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Test error');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
  });

  it('should clear error state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Set error first
    const setErrorButton = screen.getByText('Set Error');
    await act(async () => {
      setErrorButton.click();
    });

    // Then clear error
    const clearErrorButton = screen.getByText('Clear Error');
    await act(async () => {
      clearErrorButton.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should restore authentication from localStorage on mount', () => {
    // Mock localStorage with valid data
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return mockToken;
      if (key === 'user') return JSON.stringify(mockUsers.student);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('John Student');
  });

  it('should handle invalid localStorage data', () => {
    // Mock localStorage with invalid data
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'invalid-token';
      if (key === 'user') return 'invalid-json';
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
  });
});