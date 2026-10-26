import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryState } from './ui.jsx';

it('keeps an empty cached result and a retry visible after a background failure', () => {
  const refetch = vi.fn();
  render(
    <QueryState
      query={{
        isError: true,
        data: { data: [] },
        error: new Error('Could not refresh records'),
        refetch,
      }}
      empty
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Could not refresh records',
  );
  expect(screen.getByRole('status')).toHaveTextContent('No records found.');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refetch).toHaveBeenCalledOnce();
});
