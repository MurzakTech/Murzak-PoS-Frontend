import React from 'react';
import { render, screen } from '@testing-library/react';
import Photo from './Photo';

describe('Photo', () => {
  it('shows the fallback when the photo has not been added', () => {
    render(<Photo name="no-such-photo" fallback={<span>fallback shown</span>} />);
    expect(screen.getByText('fallback shown')).toBeInTheDocument();
  });

  it('shows nothing, and no broken image, when there is no fallback either', () => {
    const { container } = render(<Photo name="no-such-photo" alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
