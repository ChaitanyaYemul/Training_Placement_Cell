import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CursorEffects, { SCUBA_CURSOR_STYLESHEET } from './CursorEffects.jsx';

vi.mock('./CursorTrail.jsx', () => ({
  default: () => <canvas data-testid="sky-trail" />,
}));

const cursorSheet = () =>
  document.head.querySelector('link[data-scuba-cursor]');
const shortcut = (extra = {}) =>
  fireEvent.keyDown(window, { key: 'r', altKey: true, ...extra });

it('toggles both ways with Alt+R and keeps smoke until the cat stylesheet is ready', () => {
  render(<CursorEffects />);
  expect(screen.getByTestId('sky-trail')).toBeInTheDocument();
  shortcut();
  const sheet = cursorSheet();
  expect(sheet.href).toBe(SCUBA_CURSOR_STYLESHEET);
  expect(sheet.referrerPolicy).toBe('no-referrer');
  expect(screen.getByTestId('sky-trail')).toBeInTheDocument();
  fireEvent.load(sheet);
  expect(screen.queryByTestId('sky-trail')).not.toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  shortcut();
  expect(cursorSheet()).toBeNull();
  expect(document.documentElement).not.toHaveAttribute('data-cursor-mode');
  expect(screen.getByTestId('sky-trail')).toBeInTheDocument();
});

it('ignores plain R, repeats, composition and unrelated modifier combinations', () => {
  render(<CursorEffects />);
  for (const extra of [
    { altKey: false },
    { repeat: true },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { isComposing: true },
  ])
    shortcut(extra);
  expect(cursorSheet()).toBeNull();
  expect(screen.getByTestId('sky-trail')).toBeInTheDocument();
});

it('retains the sky trail and announces a failure if the external stylesheet cannot load', () => {
  render(<CursorEffects />);
  shortcut();
  fireEvent.error(cursorSheet());
  expect(cursorSheet()).toBeNull();
  expect(screen.getByTestId('sky-trail')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Scuba Cat could not load',
  );
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
});

it('supports the footer button and removes its stylesheet and keyboard listener on unmount', () => {
  const { unmount } = render(<CursorEffects />);
  fireEvent.click(screen.getByRole('button'));
  fireEvent.load(cursorSheet());
  expect(document.documentElement).toHaveAttribute(
    'data-cursor-mode',
    'scuba-cat',
  );
  unmount();
  expect(cursorSheet()).toBeNull();
  expect(document.documentElement).not.toHaveAttribute('data-cursor-mode');
  shortcut();
  expect(cursorSheet()).toBeNull();
});
