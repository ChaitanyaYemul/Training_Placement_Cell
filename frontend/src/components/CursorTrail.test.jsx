import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CursorTrail from './CursorTrail.jsx';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function environment({ reduced = false, fine = true } = {}) {
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const pointer = Object.assign(new EventTarget(), { matches: fine });
  vi.stubGlobal('matchMedia', (query) =>
    query.includes('reduced-motion') ? motion : pointer,
  );
  const context = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  };
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context);
  const request = vi.fn(() => 42);
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return { motion, pointer, context, getContext, request, cancel };
}

function move(target = document.body) {
  const event = new MouseEvent('pointermove', {
    bubbles: true,
    clientX: 220,
    clientY: 180,
  });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
}

it.each([{ reduced: true }, { fine: false }])(
  'does not initialize rendering when user/device preferences disable it: %j',
  (preferences) => {
    const { getContext, request } = environment(preferences);
    const { container } = render(<CursorTrail />);
    expect(container.querySelector('canvas')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    move();
    expect(getContext).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  },
);

it('stops an active trail immediately when reduced motion is enabled and removes listeners on unmount', () => {
  const { motion, request, cancel, context } = environment();
  const { unmount } = render(<CursorTrail />);
  move();
  expect(request).toHaveBeenCalledOnce();
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  expect(cancel).toHaveBeenCalledWith(42);
  expect(context.clearRect).toHaveBeenCalled();
  move();
  expect(request).toHaveBeenCalledOnce();
  unmount();
  motion.matches = false;
  motion.dispatchEvent(new Event('change'));
  move();
  expect(request).toHaveBeenCalledOnce();
});

it('clears decoration over form inputs without intercepting the input interaction', () => {
  const { request, cancel } = environment();
  render(
    <>
      <CursorTrail />
      <label>
        Email
        <input name="email" />
      </label>
    </>,
  );
  move();
  const input = screen.getByRole('textbox', { name: 'Email' });
  move(input);
  expect(cancel).toHaveBeenCalledWith(42);
  expect(request).toHaveBeenCalledOnce();
  fireEvent.change(input, { target: { value: 'student@example.edu' } });
  expect(input).toHaveValue('student@example.edu');
});
