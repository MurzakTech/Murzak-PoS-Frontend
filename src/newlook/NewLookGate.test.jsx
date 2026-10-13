import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewLookGate from './NewLookGate';
import NewLookShell, { NewLookEmptyPage } from './NewLookShell';
import { useNewLook } from './NewLookProvider';
import { ThemeProvider } from '../theme/ThemeProvider';
import { newLookRoutes } from './newLookRoutes';

jest.mock('./NewLookProvider');

const show = (look) => {
  useNewLook.mockReturnValue(look);
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <NewLookGate>
          <NewLookShell>
            <NewLookEmptyPage />
          </NewLookShell>
        </NewLookGate>
      </MemoryRouter>
    </ThemeProvider>
  );
};

test('switch OFF: the address is "page not found", as before the redesign', async () => {
  show({ enabled: false, status: 'ready' });
  expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  expect(screen.queryByText('New look')).not.toBeInTheDocument();
});

test('switch OFF and the server could not be asked: still the old app', async () => {
  show({ enabled: false, status: 'error' });
  expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
});

test('switch ON: the empty new shell loads, with its menu, page area and a way back', () => {
  show({ enabled: true, status: 'ready' });
  expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'New look' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /back to the current screens/i })).toHaveAttribute('href', '/dashboard');
  expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument();
});

test('while the answer is still unknown, a placeholder shows instead of a flash of "not found"', () => {
  show({ enabled: false, status: 'loading' });
  expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument();
});

test('the registry holds the empty page, the component page, the old-addresses page and a placeholder for every new page', () => {
  const paths = newLookRoutes.map((r) => r.path);
  expect(paths.slice(0, 4)).toEqual(['/new-look', '/new-look/components', '/new-look/charts', '/new-look/redirects']);
  expect(paths).toEqual(expect.arrayContaining(['/new-look/sales', '/new-look/stock', '/new-look/settings/team']));
  expect(new Set(paths).size).toBe(paths.length); // no address is claimed twice
});
