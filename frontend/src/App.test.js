import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

// Mock axios
jest.mock('axios');

test('renders Soliflex application', async () => {
  // Mock axios responses
  axios.get.mockResolvedValue({ data: [] });
  
  render(<App />);
  
  await waitFor(() => {
    const titleElement = screen.getByText(/Soliflex/i);
    expect(titleElement).toBeInTheDocument();
  });
});

test('renders login form when not authenticated', async () => {
  // Mock axios responses
  axios.get.mockResolvedValue({ data: [] });
  
  render(<App />);
  
  await waitFor(() => {
    // Check for login tab
    const loginTab = screen.getByText(/Login/i);
    expect(loginTab).toBeInTheDocument();
    
    // Check for register tab
    const registerTab = screen.getByText(/Register/i);
    expect(registerTab).toBeInTheDocument();
  });
});

test('renders welcome message when authenticated', async () => {
  // Mock user data
  const mockUser = {
    id: 1,
    employee_name: 'John Doe',
    role: 'admin',
    department_id: 1
  };
  
  // Mock localStorage to simulate authenticated user
  const localStorageMock = {
    getItem: jest.fn(() => JSON.stringify(mockUser)),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock axios responses
  axios.get.mockResolvedValue({ data: [] });
  
  render(<App />);
  
  await waitFor(() => {
    // Check for welcome message
    const welcomeElement = screen.getByText(/Welcome back/i);
    expect(welcomeElement).toBeInTheDocument();
  });
});
