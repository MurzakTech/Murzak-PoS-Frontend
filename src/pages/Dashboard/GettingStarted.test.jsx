import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GettingStarted from './GettingStarted';

const theme = createTheme({ custom: { gradient: 'none', gradientSoft: 'none' } });

const renderGuide = (canOpen) =>
  render(
    <ThemeProvider theme={theme}>
      <GettingStarted
        checklist={[{ done: [], dismissed: false, collapsed: false }, () => {}]}
        productCount={3}
        staffCount={1}
        hasSales={false}
        onNavigate={() => {}}
        canOpen={canOpen}
      />
    </ThemeProvider>
  );

describe('setup guide on the dashboard', () => {
  it('shows every step to an owner', () => {
    renderGuide(() => true);
    expect(screen.getByText('Enter your opening stock')).toBeInTheDocument();
    expect(screen.getByText('Invite your team')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add staff/ })).toBeInTheDocument();
  });

  it('leaves out steps whose pages the person cannot open', () => {
    renderGuide((path) => path === '/sales/pos');
    expect(screen.queryByText('Enter your opening stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Invite your team')).not.toBeInTheDocument();
  });

  it('is hidden completely for a cashier, who has nothing to set up', () => {
    const { container } = renderGuide((path) => path === '/sales/pos');
    expect(container).toBeEmptyDOMElement();
  });
});
