import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders upload dashboard navbar heading', () => {
  render(<App />);
  const linkElement = screen.getByText(/Upload QA Lab/i);
  expect(linkElement).toBeInTheDocument();
});
