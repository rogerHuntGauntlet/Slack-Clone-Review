// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => require('next-router-mock'));

// Mock next/navigation
const useRouter = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return useRouter();
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Reset mocks before each test
beforeEach(() => {
  useRouter.mockReset();
}); 