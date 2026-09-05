import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeToggle } from '@/components/shell/theme-toggle';

const setThemeMock = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: setThemeMock,
  }),
}));

describe('ThemeToggle', () => {
  it('renders theme toggle button with accessible label', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /ganti tema tampilan/i });
    expect(button).toBeInTheDocument();
  });

  it('allows user to select dark theme', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /ganti tema tampilan/i });
    await user.click(button);

    const darkOption = screen.getByRole('menuitem', { name: /gelap/i });
    expect(darkOption).toBeInTheDocument();
    
    await user.click(darkOption);
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('allows user to select light theme', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /ganti tema tampilan/i });
    await user.click(button);

    const lightOption = screen.getByRole('menuitem', { name: /terang/i });
    expect(lightOption).toBeInTheDocument();
    
    await user.click(lightOption);
    expect(setThemeMock).toHaveBeenCalledWith('light');
  });
});
