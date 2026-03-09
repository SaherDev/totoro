import React from 'react';
import { render } from '@testing-library/react';
import Page from '../src/app/page';

// Mock Clerk's useUser hook to return a test user
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isSignedIn: false,
    user: null,
    isLoaded: true,
  }),
  SignInButton: ({ children }: { children?: React.ReactNode }) => <button>{children || 'Sign In'}</button>,
  SignUpButton: ({ children }: { children?: React.ReactNode }) => <button>{children || 'Sign Up'}</button>,
  UserButton: () => <div>User Button</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Page', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Page />);
    expect(baseElement).toBeTruthy();
  });
});
