import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';

// Custom render function that includes providers
export const renderWithProviders = (ui, options = {}) => {
  const { initialEntries = ['/'], ...renderOptions } = options;

  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock user data for tests
export const mockUsers = {
  student: {
    _id: '1',
    name: 'John Student',
    email: 'student@test.com',
    role: 'Student'
  },
  teacher: {
    _id: '2',
    name: 'Jane Teacher',
    email: 'teacher@test.com',
    role: 'Teacher'
  },
  admin: {
    _id: '3',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'Admin'
  }
};

export const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';